/**
 * 选图上传：一条配置放不下图片字节，所以字节落盘、配置里只留路径。
 *
 * 这条测试守的是那次真实故障：选完文件后对话框说「配置无效」——因为整份
 * widget 配置只有 8 KiB，而图片被塞成了 data URL。现在这条路由是唯一入口。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { PICTURE_PATH, sniffPicture, storePicture } from '../src/index.mjs'

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0])
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70])
const gif = Buffer.from('GIF89a\x01\x00\x01\x00', 'latin1')
const webp = Buffer.concat([Buffer.from('RIFF', 'latin1'), Buffer.alloc(4), Buffer.from('WEBP', 'latin1')])
const avif = Buffer.concat([Buffer.alloc(4), Buffer.from('ftypavif', 'latin1'), Buffer.alloc(4)])

const post = (bytes) => new Request(`http://127.0.0.1${PICTURE_PATH}`, {
  method: 'POST',
  headers: { 'content-type': 'application/octet-stream' },
  body: bytes,
})

async function withHome(run) {
  const home = await mkdtemp(path.join(tmpdir(), 'dsh-home-picture-'))
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try { return await run(home) } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
  }
}

test('the type comes from the bytes, never from the file name', () => {
  assert.deepEqual(sniffPicture(png), { ext: '.png', type: 'image/png' })
  assert.deepEqual(sniffPicture(jpeg), { ext: '.jpg', type: 'image/jpeg' })
  assert.deepEqual(sniffPicture(gif), { ext: '.gif', type: 'image/gif' })
  assert.deepEqual(sniffPicture(webp), { ext: '.webp', type: 'image/webp' })
  assert.deepEqual(sniffPicture(avif), { ext: '.avif', type: 'image/avif' })
  assert.equal(sniffPicture(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), undefined)
  assert.equal(sniffPicture(Buffer.from('plain text')), undefined)
})

test('a stored picture is a short path, identical bytes are one file', async () => {
  const result = await withHome(async home => {
    const first = await storePicture(post(png))
    assert.equal(first.status, 200)
    const body = await first.json()
    assert.equal(body.ok, true)
    // The config keeps this string; a data URL would have blown the 8 KiB limit.
    assert.ok(body.path.length < 512, 'the stored path stays far below the config cap')
    assert.ok(body.path.startsWith(path.join(home, 'data', 'dsh-home', 'pictures')), 'stored inside the plugin data dir')
    assert.deepEqual(await readFile(body.path), png, 'the bytes on disk are the bytes that came in')
    assert.equal((await stat(body.path)).mode & 0o777, 0o600, 'a private file')
    const second = await storePicture(post(png))
    assert.equal((await second.json()).path, body.path, 'the same image is not duplicated on disk')
    const files = await readdir(path.join(home, 'data', 'dsh-home', 'pictures'))
    assert.equal(files.length, 1)
    return body
  })
  assert.match(result.path, /\.png$/u)
})

test('what is not an image, too large, or empty is refused without writing', async () => {
  await withHome(async home => {
    const pictures = path.join(home, 'data', 'dsh-home', 'pictures')
    assert.equal((await storePicture(post(Buffer.from('not an image')))).status, 415)
    assert.equal((await storePicture(post(Buffer.alloc(0)))).status, 400)
    assert.equal((await storePicture(post(Buffer.concat([png, Buffer.alloc(8 * 1024 * 1024)])))).status, 413)
    const left = await readdir(pictures).catch(() => [])
    assert.deepEqual(left, [], 'a refused upload leaves nothing behind')
  })
})

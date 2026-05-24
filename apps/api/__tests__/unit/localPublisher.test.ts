/**
 * localPublisher.test.ts — Unit tests for LocalPublisher
 */

import { LocalPublisher, createLocalPublisher } from '../../src/services/localPublisher'

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
}))

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((filePath) => {
    const parts = filePath.split('/')
    return parts.slice(0, -1).join('/')
  }),
}))

jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}))

describe('LocalPublisher — File operations', () => {
  let fs: any
  let path: any
  let publisher: LocalPublisher

  beforeEach(() => {
    jest.clearAllMocks()
    fs = require('fs/promises')
    path = require('path')

    publisher = new LocalPublisher({
      basePath: '/base/path',
    })
  })

  describe('createFolder', () => {
    test('creates folder with recursive option', async () => {
      fs.mkdir.mockResolvedValueOnce(undefined)

      await publisher.createFolder('Opportunity_001')

      expect(fs.mkdir).toHaveBeenCalledWith('/base/path/Opportunity_001', { recursive: true })
    })

    test('logs success on folder creation', async () => {
      const { logger } = require('../../src/utils/logger')
      fs.mkdir.mockResolvedValueOnce(undefined)

      await publisher.createFolder('Test_Folder')

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          fullPath: '/base/path/Test_Folder',
        }),
        'Folder created locally'
      )
    })

    test('throws error on folder creation failure', async () => {
      fs.mkdir.mockRejectedValueOnce(new Error('Permission denied'))

      await expect(publisher.createFolder('Bad_Folder')).rejects.toThrow('Permission denied')
    })

    test('logs error on folder creation failure', async () => {
      const { logger } = require('../../src/utils/logger')
      fs.mkdir.mockRejectedValueOnce(new Error('Permission denied'))

      try {
        await publisher.createFolder('Bad_Folder')
      } catch (err) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          fullPath: '/base/path/Bad_Folder',
          error: 'Permission denied',
        }),
        'Failed to create folder'
      )
    })
  })

  describe('saveFile', () => {
    test('saves file to disk with UTF-8 encoding', async () => {
      fs.mkdir.mockResolvedValueOnce(undefined)
      fs.writeFile.mockResolvedValueOnce(undefined)

      const result = await publisher.saveFile('Folder', 'test.json', '{"key":"value"}')

      expect(fs.mkdir).toHaveBeenCalledWith('/base/path/Folder', { recursive: true })
      expect(fs.writeFile).toHaveBeenCalledWith('/base/path/Folder/test.json', '{"key":"value"}', 'utf-8')
    })

    test('returns file info with name and path', async () => {
      fs.mkdir.mockResolvedValueOnce(undefined)
      fs.writeFile.mockResolvedValueOnce(undefined)

      const result = await publisher.saveFile('Folder', 'data.json', 'content')

      expect(result).toEqual({
        name: 'data.json',
        path: '/base/path/Folder/data.json',
      })
    })

    test('creates parent directories when saving file', async () => {
      fs.mkdir.mockResolvedValueOnce(undefined)
      fs.writeFile.mockResolvedValueOnce(undefined)

      await publisher.saveFile('Level1/Level2', 'file.md', 'content')

      expect(fs.mkdir).toHaveBeenCalledWith('/base/path/Level1/Level2', { recursive: true })
    })

    test('logs success on file save', async () => {
      const { logger } = require('../../src/utils/logger')
      fs.mkdir.mockResolvedValueOnce(undefined)
      fs.writeFile.mockResolvedValueOnce(undefined)

      await publisher.saveFile('Folder', 'test.txt', 'data')

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          fullPath: '/base/path/Folder/test.txt',
        }),
        'File saved locally'
      )
    })

    test('throws error on file write failure', async () => {
      fs.mkdir.mockResolvedValueOnce(undefined)
      fs.writeFile.mockRejectedValueOnce(new Error('Disk full'))

      await expect(publisher.saveFile('Folder', 'file.txt', 'data')).rejects.toThrow('Disk full')
    })

    test('logs error on file write failure', async () => {
      const { logger } = require('../../src/utils/logger')
      fs.mkdir.mockResolvedValueOnce(undefined)
      fs.writeFile.mockRejectedValueOnce(new Error('Disk full'))

      try {
        await publisher.saveFile('Folder', 'file.txt', 'data')
      } catch (err) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          fullPath: '/base/path/Folder/file.txt',
          error: 'Disk full',
        }),
        'Failed to save file'
      )
    })

    test('handles multiple files in same folder', async () => {
      fs.mkdir.mockResolvedValue(undefined)
      fs.writeFile.mockResolvedValue(undefined)

      await publisher.saveFile('Folder', 'file1.json', 'content1')
      await publisher.saveFile('Folder', 'file2.json', 'content2')

      expect(fs.writeFile).toHaveBeenCalledTimes(2)
      expect(fs.writeFile).toHaveBeenNthCalledWith(1, '/base/path/Folder/file1.json', 'content1', 'utf-8')
      expect(fs.writeFile).toHaveBeenNthCalledWith(2, '/base/path/Folder/file2.json', 'content2', 'utf-8')
    })
  })

  describe('createLocalPublisher factory', () => {
    beforeEach(() => {
      jest.resetModules()
    })

    test('creates publisher with process.cwd-based path', () => {
      const publisher = createLocalPublisher()
      expect(publisher).toBeInstanceOf(LocalPublisher)
    })
  })
})

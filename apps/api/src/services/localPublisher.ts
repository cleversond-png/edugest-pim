import fs from 'fs/promises'
import path from 'path'
import { logger } from '../utils/logger'
import { IPublisher, PublishedFile } from './publisher.interface'

export interface LocalPublisherConfig {
  basePath: string
}

export class LocalPublisher implements IPublisher {
  private basePath: string

  constructor(config: LocalPublisherConfig) {
    this.basePath = config.basePath
  }

  async createFolder(folderPath: string): Promise<void> {
    const fullPath = path.join(this.basePath, folderPath)
    try {
      await fs.mkdir(fullPath, { recursive: true })
      logger.debug({ fullPath }, 'Folder created locally')
    } catch (err: any) {
      logger.error({ fullPath, error: err.message }, 'Failed to create folder')
      throw err
    }
  }

  async saveFile(folderPath: string, filename: string, content: string): Promise<PublishedFile> {
    const fullPath = path.join(this.basePath, folderPath, filename)
    const dirPath = path.dirname(fullPath)

    try {
      await fs.mkdir(dirPath, { recursive: true })
      await fs.writeFile(fullPath, content, 'utf-8')
      logger.debug({ fullPath }, 'File saved locally')
      return { name: filename, path: fullPath }
    } catch (err: any) {
      logger.error({ fullPath, error: err.message }, 'Failed to save file')
      throw err
    }
  }
}

export function createLocalPublisher(): LocalPublisher {
  const basePath = path.join(process.cwd(), 'PIM')
  return new LocalPublisher({ basePath })
}

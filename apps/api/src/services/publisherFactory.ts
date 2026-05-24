import { IPublisher } from './publisher.interface'
import { createLocalPublisher } from './localPublisher'
import { createSharePointPublisher } from './sharePointPublisher'
import { logger } from '../utils/logger'

export function createPublisher(): IPublisher {
  const publishMode = process.env.PUBLISH_MODE || 'local'

  if (publishMode === 'sharepoint') {
    const hasGraphCreds =
      process.env.AZURE_TENANT_ID &&
      process.env.AZURE_CLIENT_ID &&
      (process.env.AZURE_CLIENT_SECRET || (process.env.GRAPH_USERNAME && process.env.GRAPH_PASSWORD))
    const hasSharePointConfig = process.env.SHAREPOINT_SITE_ID && process.env.SHAREPOINT_DRIVE_ID

    if (!hasGraphCreds || !hasSharePointConfig) {
      logger.warn(
        'SharePoint mode requested but credentials missing. Falling back to local publishing.'
      )
      return createLocalPublisher()
    }

    logger.info('Using SharePoint publisher')
    return createSharePointPublisher()
  }

  logger.info('Using local filesystem publisher')
  return createLocalPublisher()
}

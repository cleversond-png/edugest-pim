export interface PublishedFile {
  name: string
  path: string
}

export interface IPublisher {
  saveFile(folderPath: string, filename: string, content: string): Promise<PublishedFile>
}

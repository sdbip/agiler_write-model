export enum ItemEvent {
  Created = 'Created',
  ChildrenAdded = 'ChildrenAdded',
  ChildrenRemoved = 'ChildrenRemoved',
  ParentChanged = 'ParentChanged',
  ProgressChanged = 'ProgressChanged',
  TypeChanged = 'TypeChanged',
}

export enum ItemType {
  Epic = 'Epic',
  Feature = 'Feature',
  Story = 'Story',
  Task = 'Task'
}

export enum Progress {
  NotStarted = 'notStarted',
  Completed = 'completed'
}

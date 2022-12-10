export var ItemEvent;
(function (ItemEvent) {
    ItemEvent["Created"] = "Created";
    ItemEvent["ChildrenAdded"] = "ChildrenAdded";
    ItemEvent["ChildrenRemoved"] = "ChildrenRemoved";
    ItemEvent["ParentChanged"] = "ParentChanged";
    ItemEvent["ProgressChanged"] = "ProgressChanged";
    ItemEvent["TypeChanged"] = "TypeChanged";
})(ItemEvent || (ItemEvent = {}));
export var ItemType;
(function (ItemType) {
    ItemType["Epic"] = "Epic";
    ItemType["Feature"] = "Feature";
    ItemType["Story"] = "Story";
    ItemType["Task"] = "Task";
})(ItemType || (ItemType = {}));
export var Progress;
(function (Progress) {
    Progress["NotStarted"] = "notStarted";
    Progress["Completed"] = "completed";
})(Progress || (Progress = {}));

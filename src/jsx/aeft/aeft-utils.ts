export const getActiveComp = (): CompItem | null => {
  if (
    app.project.activeItem &&
    app.project.activeItem instanceof CompItem
  ) {
    return app.project.activeItem as CompItem;
  }
  // Try activating the viewer first
  try {
    if (app.activeViewer) {
      app.activeViewer.setActive();
    }
  } catch (e) {}
  if (
    app.project.activeItem &&
    app.project.activeItem instanceof CompItem
  ) {
    return app.project.activeItem as CompItem;
  }
  return null;
};

export const getProjectDir = (): Folder | null => {
  if (app.project.file !== null) {
    return app.project.file.parent;
  }
  return null;
};

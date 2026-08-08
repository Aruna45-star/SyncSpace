import * as Y from "yjs";

// Create a shared Yjs document
const ydoc = new Y.Doc();

// Create a shared text area inside the document
const ytext = ydoc.getText("code");

export { ydoc, ytext };
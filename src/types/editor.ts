export type EditorTab = 'html' | 'css' | 'js';

export type PreviewMode = 'design' | 'interact';

export type ElementTemplateType = 'box' | 'heading' | 'button' | 'input';

export interface SelectedElementInfo {
  id: string;
  tagName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
  color: string;
  fontSize: number;
  borderRadius: number;
  textContent: string | null;
  isLeafText: boolean;
}

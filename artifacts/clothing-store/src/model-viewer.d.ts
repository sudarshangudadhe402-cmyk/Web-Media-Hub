/// <reference types="react" />

declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          "auto-rotate"?: boolean | string;
          "camera-controls"?: boolean | string;
          "shadow-intensity"?: string;
          exposure?: string;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

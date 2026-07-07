import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Page } from "react-pdf";

/**
 * PDF page with a field overlay locked to the rendered canvas pixel rect.
 */
export const PdfPageLayer = forwardRef(function PdfPageLayer({
  pageNumber,
  width,
  className = "",
  overlayClassName = "",
  overlayStyle,
  onOverlayClick,
  overlayCursor,
  children,
  loading,
  error,
}, ref) {
  const wrapRef = useRef(null);
  const [canvasBox, setCanvasBox] = useState(null);

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = wrap?.querySelector(".react-pdf__Page__canvas");
    if (!wrap || !canvas || canvas.offsetWidth < 1 || canvas.offsetHeight < 1) return;
    setCanvasBox({
      top: canvas.offsetTop,
      left: canvas.offsetLeft,
      width: canvas.offsetWidth,
      height: canvas.offsetHeight,
    });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [width, pageNumber, measure]);

  useEffect(() => {
    const canvas = wrapRef.current?.querySelector(".react-pdf__Page__canvas");
    if (!canvas) return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [measure, width, pageNumber]);

  return (
    <div
      ref={(node) => {
        wrapRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={`relative mb-6 max-w-full shrink-0 overflow-visible bg-white shadow-[0_6px_24px_rgba(15,23,32,0.12)] ${className}`}
      style={canvasBox ? { width: canvasBox.width, height: canvasBox.height } : { width }}
      data-testid="pdf-page-layer"
    >
      <Page
        pageNumber={pageNumber}
        width={width}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        onRenderSuccess={measure}
        loading={loading}
        error={error}
        className="!m-0 !bg-transparent"
      />
      {canvasBox && (
        <div
          className={`absolute z-10 overflow-visible ${overlayClassName}`}
          style={{
            top: canvasBox.top,
            left: canvasBox.left,
            width: canvasBox.width,
            height: canvasBox.height,
            cursor: overlayCursor,
            overflow: "visible",
            ...overlayStyle,
          }}
          onClick={onOverlayClick}
          data-testid="pdf-page-overlay"
        >
          {typeof children === "function" ? children(canvasBox.height) : children}
        </div>
      )}
    </div>
  );
});
import React, { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);
  const [isClicking, setIsClicking] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const isTouchDevice = () => {
      try {
        document.createEvent('TouchEvent');
        return true;
      } catch (e) {
        return false;
      }
    };

    const move = (e) => {
      const touchEvent = e.touches ? e.touches[0] : null;
      const x = !isTouchDevice() ? e.clientX : touchEvent?.clientX || 0;
      const y = !isTouchDevice() ? e.clientY : touchEvent?.clientY || 0;

      setCursorX(x);
      setCursorY(y);
      
      const cursorBorder = document.getElementById('cursor-border');
      if (cursorBorder) {
        cursorBorder.style.left = `${x}px`;
        cursorBorder.style.top = `${y}px`;
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    
    // Global hover detection for interactive elements
    const handleMouseOver = (e) => {
      const target = e.target;
      if (['BUTTON', 'INPUT', 'A'].includes(target.tagName) || target.closest('button')) {
        setIsHovering(true);
      }
    };
    const handleMouseOut = (e) => {
      const target = e.target;
      if (['BUTTON', 'INPUT', 'A'].includes(target.tagName) || target.closest('button')) {
        setIsHovering(false);
      }
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('touchmove', move);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  return (
    <>
      <style>
        {`
        * {
            cursor: none !important;
        }

        #cursor {
            position: fixed;
            background-color: var(--cursor-dot);
            height: 10px;
            width: 10px;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            transition: transform 0.2s ease, background-color 0.2s ease;
            z-index: 9999;
            top: 0; left: 0;
        }

        #cursor-border {
            position: fixed;
            width: 40px;
            height: 40px;
            background-color: transparent;
            border: 2px solid var(--cursor-ring);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            transition: width 0.2s ease, height 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
            z-index: 9998;
            top: 0; left: 0;
        }

        ${isClicking ? `
        #cursor { transform: translate(-50%, -50%) scale(0.8); }
        #cursor-border { width: 30px; height: 30px; background-color: rgba(128, 128, 128, 0.2); }
        ` : ''}

        ${isHovering && !isClicking ? `
        #cursor-border { width: 50px; height: 50px; background-color: color-mix(in srgb, var(--cursor-hover-accent) 18%, transparent); border-color: var(--cursor-hover-accent); }
        #cursor { background-color: var(--cursor-hover-accent); }
        ` : ''}
      `}
      </style>
      <div id="cursor" style={{ left: `${cursorX}px`, top: `${cursorY}px` }}></div>
      <div id="cursor-border"></div>
    </>
  );
}

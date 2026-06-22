import React, { useEffect, useState } from 'react';
import useEditorStore from '../store/editorStore';

const PresenceCursors = ({ editor }) => {
  const remoteCursors = useEditorStore((state) => state.remoteCursors);
  const [cursors, setCursors] = useState([]);

  useEffect(() => {
    const cursorElements = [];

    Object.entries(remoteCursors).forEach(([testId, cursorData]) => {
      if (cursorData && cursorData.position) {
        try {
          const coords = editor.view.coordsAtPos(cursorData.position);
          cursorElements.push({
            testId,
            name: cursorData.name,
            color: cursorData.color,
            top: coords.top,
            left: coords.left
          });
        } catch (error) {
          // Ignore coordinate calculation errors
        }
      }
    });

    setCursors(cursorElements);
  }, [remoteCursors, editor]);

  return (
    <>
      {cursors.map((cursor) => (
        <div
          key={cursor.testId}
          data-testid={cursor.testId}
          className="user-cursor"
          style={{
            top: cursor.top + 'px',
            left: cursor.left + 'px',
            '--cursor-color': cursor.color
          }}
          data-name={cursor.name}
        />
      ))}
    </>
  );
};

export default PresenceCursors;

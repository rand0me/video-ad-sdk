const createSlot = (placeholder, width, height) => {
  const slot = document.createElement('DIV');

  Object.assign(slot.style, {
    border: '0px',
    cursor: 'pointer',
    height: `${height}px`,
    left: '0px',
    margin: '0px',
    padding: '0px',
    position: 'absolute',
    top: '0px',
    width: `${width}px`
  });

  placeholder.appendChild(slot);

  return slot;
};

export default createSlot;

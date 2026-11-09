import { useEffect, useRef, type ClipboardEventHandler, type KeyboardEventHandler } from 'react';

export default function Prac() {
    const imgRef = useRef<null | HTMLImageElement>(null);
    const rootRef = useRef<null | HTMLDivElement>(null);

    const handleClick = async () => {
        const res = await navigator.clipboard.read();
        console.log(res);
        const r = await res[0].getType(res[0].types[0]);
        console.log(r);
        const url = URL.createObjectURL(r);
        imgRef.current!.src = url;
    };

    const handleKeydown: ClipboardEventHandler = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const res = await navigator.clipboard.read();
        console.log(res);
        const r = await res[0].getType(res[0].types[0]);
        console.log(r);
        const url = URL.createObjectURL(r);
        imgRef.current!.src = url;
    };

    return (
        <div
            ref={rootRef}
            style={{ width: '100%', height: '100vh', backgroundColor: 'green' }}
            onPaste={handleKeydown}
        >
            <button onClick={handleClick}>点我阅读剪贴板</button>
            <img ref={imgRef} />
        </div>
    );
}

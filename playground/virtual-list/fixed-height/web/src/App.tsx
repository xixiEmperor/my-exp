import { useRef, useState, type UIEvent } from 'react';
import './App.css';

// 行高和视口高度固定，滚动位置可以直接换算成数据下标。
const ROW_HEIGHT = 40;
const VIEWPORT_HEIGHT = 400;
const OVERSCAN = 5;
const ITEMS = Array.from({ length: 10_000 }, (_, index) => ({
    id: index + 1,
    title: `第 ${index + 1} 条记录`,
}));

export default function App() {
    const viewportRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);

    // 可见区前后各保留少量缓冲行，避免滚动边缘出现空白。
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const end = Math.min(
        ITEMS.length,
        Math.ceil((scrollTop + VIEWPORT_HEIGHT) / ROW_HEIGHT) + OVERSCAN,
    );
    const visibleItems = ITEMS.slice(start, end);

    function handleScroll(event: UIEvent<HTMLDivElement>) {
        setScrollTop(event.currentTarget.scrollTop);
    }

    function jumpTo(top: number) {
        const viewport = viewportRef.current;
        if (!viewport) return;

        // 浏览器会限制实际滚动位置，读取实际值同步渲染区间。
        viewport.scrollTop = top;
        setScrollTop(viewport.scrollTop);
    }

    return (
        <main className="demo">
            <header>
                <p className="eyebrow">VIRTUAL LIST / FIXED HEIGHT</p>
                <h1>定高虚拟列表</h1>
                <p className="description">滚动 10,000 条记录，只渲染当前区间。</p>
            </header>

            <div className="toolbar">
                <p>
                    行高 {ROW_HEIGHT}px · DOM 行数 <strong>{visibleItems.length}</strong>
                </p>
                <div className="actions">
                    <button type="button" onClick={() => jumpTo(0)}>
                        回到顶部
                    </button>
                    <button type="button" onClick={() => jumpTo(ITEMS.length * ROW_HEIGHT)}>
                        到达底部
                    </button>
                </div>
            </div>

            <section className="list-frame">
                <div
                    ref={viewportRef}
                    className="viewport"
                    style={{ height: VIEWPORT_HEIGHT }}
                    role="list"
                    aria-label="定高虚拟列表，共 10000 条记录"
                    tabIndex={0}
                    onScroll={handleScroll}
                >
                    {/* 完整高度负责滚动条，实际 DOM 只保留切片后的记录。 */}
                    <div className="spacer" style={{ height: ITEMS.length * ROW_HEIGHT }}>
                        <div
                            className="window"
                            style={{ transform: `translateY(${start * ROW_HEIGHT}px)` }}
                        >
                            {visibleItems.map((item) => (
                                <div
                                    key={item.id}
                                    className={item.id % 2 === 0 ? 'row row-even' : 'row'}
                                    style={{ height: ROW_HEIGHT }}
                                    role="listitem"
                                    aria-setsize={ITEMS.length}
                                    aria-posinset={item.id}
                                >
                                    <span className="row-number">
                                        {String(item.id).padStart(5, '0')}
                                    </span>
                                    <span>{item.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <p className="range">
                当前渲染：第 {start + 1} 至 {end} 条 · 前后缓冲 {OVERSCAN} 行
            </p>
        </main>
    );
}

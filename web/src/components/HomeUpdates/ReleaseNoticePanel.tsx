import type { ReleaseNotice } from '../../types/home';

interface Props {
    notice: ReleaseNotice;
    selected: boolean;
}

// 更新说明和功能清单使用同一份通知数据，隐藏面板不参与键盘导航。
export default function ReleaseNoticePanel({ notice, selected }: Props) {
    return (
        <article
            className="updates-detail"
            role="tabpanel"
            id={`update-panel-${notice.id}`}
            aria-labelledby={`update-tab-${notice.id}`}
            hidden={!selected}
            tabIndex={0}
        >
            <time dateTime={notice.date}>{notice.date}</time>
            <div className="updates-detail-copy">
                <h3>{notice.title}</h3>
                <p>{notice.description}</p>
                {notice.changes.length > 0 ? (
                    <ul>
                        {notice.changes.map((change) => (
                            <li key={change}>{change}</li>
                        ))}
                    </ul>
                ) : null}
            </div>
        </article>
    );
}

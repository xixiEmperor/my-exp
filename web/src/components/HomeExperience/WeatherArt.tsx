// 天气图形由 React 管理，接口数据只能选择图形，不能插入任意标记。
export default function WeatherArt() {
    return (
        <svg viewBox="0 0 112 88" focusable="false">
            <defs>
                <path
                    id="weather-cloud-outline"
                    d="M25 62C12 62 10 43 24 39C23 21 46 15 56 28C67 15 89 25 86 40C106 41 107 62 87 63Z"
                />
                <g id="weather-cloud-face">
                    <circle cx="47" cy="44" r="2" fill="#53626a" />
                    <circle cx="65" cy="44" r="2" fill="#53626a" />
                    <path className="weather-face" d="M51 51Q56 56 61 51" />
                    <ellipse className="weather-cheek" cx="40" cy="49" rx="4" ry="2" />
                    <ellipse className="weather-cheek" cx="72" cy="49" rx="4" ry="2" />
                </g>
                <g id="weather-sun-body">
                    <path
                        className="weather-rays"
                        d="M56 5V11M56 69V75M21 40H27M85 40H91M31 15L35 19M77 61L81 65M31 65L35 61M77 19L81 15"
                    />
                    <circle className="weather-sun" cx="56" cy="40" r="23" />
                    <circle cx="49" cy="37" r="2" fill="#7e623e" />
                    <circle cx="63" cy="37" r="2" fill="#7e623e" />
                    <path
                        d="M51 45Q56 50 61 45"
                        fill="none"
                        stroke="#7e623e"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                    />
                </g>
            </defs>
            <g className="weather-shape weather-shape-sun">
                <use href="#weather-sun-body" />
            </g>
            <g className="weather-shape weather-shape-cloud">
                <use className="weather-cloud" href="#weather-cloud-outline" />
                <use href="#weather-cloud-face" />
            </g>
            <g className="weather-shape weather-shape-partly">
                <use href="#weather-sun-body" transform="translate(18,-7) scale(.85)" />
                <use
                    className="weather-cloud"
                    href="#weather-cloud-outline"
                    transform="translate(-4,10) scale(.9)"
                />
                <use href="#weather-cloud-face" transform="translate(-4,10) scale(.9)" />
            </g>
            <g className="weather-shape weather-shape-rain">
                <use
                    className="weather-cloud"
                    href="#weather-cloud-outline"
                    transform="translate(0,-8)"
                />
                <use href="#weather-cloud-face" transform="translate(0,-8)" />
                <path className="weather-drops" d="M34 64L30 73M55 67L51 76M77 64L73 73" />
            </g>
            <g className="weather-shape weather-shape-snow">
                <use
                    className="weather-cloud"
                    href="#weather-cloud-outline"
                    transform="translate(0,-8)"
                />
                <use href="#weather-cloud-face" transform="translate(0,-8)" />
                <path
                    className="weather-snow"
                    d="M33 63V77M27 66L39 74M27 74L39 66M74 63V77M68 66L80 74M68 74L80 66"
                />
            </g>
            <g className="weather-shape weather-shape-storm">
                <use
                    className="weather-cloud"
                    href="#weather-cloud-outline"
                    transform="translate(0,-8)"
                />
                <use href="#weather-cloud-face" transform="translate(0,-8)" />
                <path className="weather-bolt" d="M54 58L46 72H55L50 85L68 65H58L63 58Z" />
            </g>
            <g className="weather-shape weather-shape-fog">
                <use
                    className="weather-cloud"
                    href="#weather-cloud-outline"
                    transform="translate(0,-8)"
                />
                <use href="#weather-cloud-face" transform="translate(0,-8)" />
                <path className="weather-drops" d="M30 64H80M24 72H72M40 80H87" />
            </g>
        </svg>
    );
}

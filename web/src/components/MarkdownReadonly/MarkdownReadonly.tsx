import Markdown from 'react-markdown';

interface Props {
    content: string;
}

export default function MarkdownReadonly({ content }: Props) {
    return <Markdown>{content}</Markdown>;
}

import { toast } from '@/utils/toast';

export function handleError(error: unknown) {
    if (error instanceof Error) {
        toast.error(error.message);
    } else {
        console.error('未知错误：', error);
    }
}

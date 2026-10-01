import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from 'zustand';
import { uiStore } from '../stores/ui';

// 站点公共交互集中在 hook：组件只负责按钮、菜单和遮罩的结构。
export function useSiteShell() {
  const location = useLocation();

  const menuRef = useRef<HTMLDetailsElement>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);

  const menuOpen = useStore(uiStore, (state) => state.menuOpen);

  const loginOpen = useStore(uiStore, (state) => state.loginOpen);

  const closeLogin = useStore(uiStore, (state) => state.closeLogin);

  const openLogin = useStore(uiStore, (state) => state.openLogin);

  const toggleMenu = useCallback((event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    uiStore.getState().toggleMenu();
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const dismiss = (event: globalThis.MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node) || (event.target as Element).closest('a')) {
        uiStore.getState().closeMenu();
      }
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        uiStore.getState().closeMenu();
      }
    };
    document.addEventListener('click', dismiss);
    document.addEventListener('keydown', escape);

    return () => {
      document.removeEventListener('click', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [menuOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (loginOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }

      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = previous;
      };
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [loginOpen]);

  useEffect(() => {
    uiStore.getState().closeOverlays();

    if (location.hash) {
      // 站内锚点也支持从知识库入口返回首页，使用固定 ID 查找目标。
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    document.title = location.pathname === '/' ? '知页 · 我的数字小院' : '知页 · 知识库';
  }, [location.pathname, location.hash]);

  return {
    menuOpen,
    menuRef,
    dialogRef,
    activePath: location.pathname,
    toggleMenu,
    openLogin,
    closeLogin,
  };
}

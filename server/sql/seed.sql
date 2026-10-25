-- 在创建表后导入示例数据，固定 ID 便于核对文件夹和文章的关联。
USE my_exp;

START TRANSACTION;

-- 先插入根文件夹，再插入子文件夹，满足外键约束。
INSERT INTO folders (id, name, parent_id, sort_order) VALUES
  ('V1StGXR8_Z5jdHi6B-myT', '前端开发', NULL, 1),
  ('mJ7qR2vN9xK4sT6wY8zAb', '后端开发', NULL, 2);

INSERT INTO folders (id, name, parent_id, sort_order) VALUES
  ('pL3nF8cD1hS5uW7eQ9rYk', 'React 笔记', 'V1StGXR8_Z5jdHi6B-myT', 1),
  ('aB6dE2gH8jK4mN0pR5tUv', 'MySQL 笔记', 'mJ7qR2vN9xK4sT6wY8zAb', 1);

-- 覆盖已发布文章、草稿、根目录文章和软删除文章。
INSERT INTO articles
  (id, title, content, preview, status, folder_id, views, slug, published_at, deleted_at)
VALUES
  ('cD9fG3hJ7kL1nP5rS8uWx', 'React 组件拆分笔记',
   '# React 组件拆分笔记\n\n按职责拆分组件，让每个组件只处理一件事。',
   '记录 React 组件拆分的常用思路。', 'published',
   'pL3nF8cD1hS5uW7eQ9rYk', 128, 'react-component-notes', CURRENT_TIMESTAMP, NULL),
  ('eF4gH0jK6mN2pQ8sT1vYz', 'MySQL 主键设计',
   '# MySQL 主键设计\n\n本项目使用 NanoID 作为文章和文件夹的主键。',
   '记录主键类型和关联字段的选择。', 'published',
   'aB6dE2gH8jK4mN0pR5tUv', 64, 'mysql-primary-key', CURRENT_TIMESTAMP, NULL),
  ('gH5jK1mN7pQ3sT9vW2yAb', '待整理的开发笔记',
   '# 待整理的开发笔记\n\n这里保存尚未发布的内容。',
   NULL, 'draft', 'V1StGXR8_Z5jdHi6B-myT', 0, NULL, NULL, NULL),
  ('jK6mN2pQ8sT4vW0yZ3bCd', '欢迎阅读',
   '# 欢迎阅读\n\n这里用来整理开发过程中积累的经验。',
   '这个站点的第一篇文章。', 'published',
   NULL, 16, 'welcome', CURRENT_TIMESTAMP, NULL),
  ('nP7qR3sT9vW5yZ1bC4dEf', '已归档的旧笔记',
   '# 已归档的旧笔记\n\n这篇文章用于演示软删除状态。',
   NULL, 'draft', 'mJ7qR2vN9xK4sT6wY8zAb', 0, NULL, NULL, CURRENT_TIMESTAMP);

COMMIT;

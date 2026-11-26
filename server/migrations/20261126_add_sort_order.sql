-- 为 articles 表新增目录内手动排序字段，并为 folders/articles 补充排序组合索引。
-- 执行前提：MySQL 8.0+（窗口函数 ROW_NUMBER）。

ALTER TABLE articles
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0 COMMENT '目录内手动排序' AFTER folder_id,
  ADD KEY idx_folder_sort (folder_id, sort_order);

ALTER TABLE folders
  ADD KEY idx_parent_sort (parent_id, sort_order);

-- 为现有文件夹按父目录分组初始化顺序，保持与当前按创建时间一致的展示效果。
UPDATE folders f
JOIN (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY created_at, id) - 1 AS rn
  FROM folders
) ranked ON f.id = ranked.id
SET f.sort_order = ranked.rn;

-- 为现有未删除文章按所属文件夹分组初始化顺序。
UPDATE articles a
JOIN (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY folder_id ORDER BY created_at, id) - 1 AS rn
  FROM articles
  WHERE deleted_at IS NULL
) ranked ON a.id = ranked.id
SET a.sort_order = ranked.rn;

CREATE DATABASE IF NOT EXISTS my_exp CHARACTER SET 'utf8mb4';

USE my_exp;

CREATE TABLE users (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  openid         VARCHAR(64)     NOT NULL COMMENT '微信 openid，不返回给前端',
  name           VARCHAR(255)    NOT NULL COMMENT '昵称，初始为16位随机字符串',
  role           ENUM('admin', 'user') NOT NULL DEFAULT 'user' COMMENT '用户角色',
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_active_at DATETIME        NULL     COMMENT '最后活跃时间，建议节流更新',
  PRIMARY KEY (id),
  UNIQUE KEY uk_openid (openid)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '用户表';
 
-- 2. 文件夹表
CREATE TABLE folders (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(255)    NOT NULL COMMENT '文件夹名称',
  parent_id   BIGINT UNSIGNED NULL     COMMENT '父文件夹id，NULL表示根目录',
  sort_order  INT             NOT NULL DEFAULT 0 COMMENT '手动排序',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_parent_id (parent_id),
  CONSTRAINT fk_folders_parent
    FOREIGN KEY (parent_id)
    REFERENCES folders (id)
    ON DELETE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '文件夹表';
 
-- 3. 文章表
CREATE TABLE articles (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title            VARCHAR(255)    NOT NULL COMMENT '标题',
  content          MEDIUMTEXT      NOT NULL COMMENT '正文',
  preview          TEXT            NULL     COMMENT '游客可读的预览部分',
  status           ENUM('draft', 'published') NOT NULL DEFAULT 'draft' COMMENT '草稿/已发布',
  folder_id        BIGINT UNSIGNED NULL     COMMENT '所属文件夹id，NULL表示根目录',
  slug             VARCHAR(255)    NULL     COMMENT '友好URL，可选',
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at     DATETIME        NULL     COMMENT '发布时间',
  last_modified_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP COMMENT '最后修改时间',
  deleted_at       DATETIME        NULL     COMMENT '软删除标记，NULL表示未删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_slug (slug),
  KEY idx_folder_id (folder_id),
  CONSTRAINT fk_articles_folder
    FOREIGN KEY (folder_id)
    REFERENCES folders (id)
    ON DELETE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '文章表';
 
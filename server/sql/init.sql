CREATE DATABASE IF NOT EXISTS my_exp CHARACTER SET 'utf8mb4';

USE my_exp;

CREATE TABLE IF NOT EXISTS users (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  openid         VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '微信 openid，不返回给前端',
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
CREATE TABLE IF NOT EXISTS folders (
  -- 主键由应用生成，使用区分大小写的 NanoID。
  id          CHAR(21) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '对外暴露的ID（NanoID）',
  name        VARCHAR(255)    NOT NULL COMMENT '文件夹名称',
  parent_id   CHAR(21) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT '父文件夹id，NULL表示根目录',
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
CREATE TABLE IF NOT EXISTS articles (
  -- 主键由应用生成，使用区分大小写的 NanoID。
  id               CHAR(21) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '对外暴露的ID（NanoID）',
  title            VARCHAR(255)    NOT NULL COMMENT '标题',
  content          MEDIUMTEXT      NOT NULL COMMENT '正文',
  preview          MEDIUMTEXT      NULL     COMMENT '游客可读的预览部分',
  status           ENUM('draft', 'published') NOT NULL DEFAULT 'draft' COMMENT '草稿/已发布',
  folder_id        CHAR(21) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT '所属文件夹id，NULL表示根目录',
  views            BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '文章浏览次数',
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

-- 保存 demo 本身的资料与前台展示状态。
CREATE TABLE demo_entries (
    id CHAR(21) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    slug VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '稳定资源目录标识',
    name VARCHAR(255) NOT NULL COMMENT '展示名称',
    description TEXT NULL COMMENT 'demo 说明',
    tags JSON NULL COMMENT '检索标签',
    status ENUM('draft', 'published', 'hidden') NOT NULL DEFAULT 'draft',
    current_resource_id CHAR(21) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT '默认资源版本',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_demo_slug (slug),
    KEY idx_demo_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 每条记录对应一个已上传的 demo 版本，verison 保留指定拼写。
CREATE TABLE demo_resources (
    id CHAR(21) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    demo_entry_id CHAR(21) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    implementation VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '实现目录，default 表示场景根',
    verison VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'x.x.x 格式的版本',
    r2_prefix VARCHAR(512) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '桶内版本资源前缀',
    file_paths JSON NOT NULL COMMENT '以 demos/slug 为根的源码相对路径数组',
    exclude_paths JSON NULL COMMENT '相对于所选实现目录的排除规则',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_demo_verison (demo_entry_id, verison),
    CONSTRAINT fk_demo_resource_entry FOREIGN KEY (demo_entry_id)
        REFERENCES demo_entries (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
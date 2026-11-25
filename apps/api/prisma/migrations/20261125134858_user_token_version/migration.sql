-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openid" TEXT NOT NULL,
    "unionid" TEXT,
    "nickname" TEXT NOT NULL DEFAULT '小厨房主人',
    "avatar_key" TEXT NOT NULL DEFAULT 'sunflower',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_users" ("avatar_key", "created_at", "id", "nickname", "openid", "status", "unionid", "updated_at") SELECT "avatar_key", "created_at", "id", "nickname", "openid", "status", "unionid", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_openid_key" ON "users"("openid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

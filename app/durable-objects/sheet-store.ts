import { DurableObject } from "cloudflare:workers";

export class SheetStore extends DurableObject {
  isInited = false;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private init() {
    if (this.isInited) {
      return;
    }
    // Create tables for versioned character data and images
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS versions (
        version INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data JSON
      );
      CREATE INDEX IF NOT EXISTS idx_created_at ON versions(created_at);
      
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_data TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    this.isInited = true;
    return { success: true };
  }

  saveData(jsonData: any) {
    this.init();
    // Insert the new data
    this.ctx.storage.sql.exec("INSERT INTO versions (data) VALUES (?)", [
      JSON.stringify(jsonData),
    ]);

    // Clean up old versions (keep only last 14 days worth of changes or last 100 versions)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Delete versions older than 14 days
    this.ctx.storage.sql.exec("DELETE FROM versions WHERE created_at < ?", [
      twoWeeksAgo.toISOString(),
    ]);

    // Also ensure we don't keep more than 100 versions
    const countResult = this.ctx.storage.sql
      .exec("SELECT COUNT(*) as count FROM versions")
      .one();

    if (countResult.count && (countResult.count as number) > 100) {
      const deleteCount = (countResult.count as number) - 100;
      this.ctx.storage.sql.exec(
        "DELETE FROM versions WHERE version IN (SELECT version FROM versions ORDER BY version ASC LIMIT ?)",
        [deleteCount]
      );
    }

    return { success: true };
  }

  saveImage(imageData: string) {
    this.init();
    // Delete existing image and insert new one
    this.ctx.storage.sql.exec("DELETE FROM images");
    this.ctx.storage.sql.exec("INSERT INTO images (image_data) VALUES (?)", [
      imageData,
    ]);
    return { success: true };
  }

  getImage(): string | null {
    this.init();
    const results = this.ctx.storage.sql
      .exec("SELECT image_data FROM images LIMIT 1")
      .toArray();

    if (!results || results.length === 0) {
      return null;
    }

    return (results[0].image_data as string) || null;
  }

  listVersions() {
    this.init();
    // List all versions with their created_at times
    const versions = this.ctx.storage.sql
      .exec("SELECT version, created_at FROM versions ORDER BY version DESC")
      .toArray();

    return versions;
  }

  getVersion(versionId: number): any {
    this.init();
    const results = this.ctx.storage.sql
      .exec("SELECT data, created_at FROM versions WHERE version = ?", [
        versionId,
      ])
      .toArray();

    if (!results || results.length === 0) {
      return null;
    }

    return {
      ...JSON.parse(results[0].data as string),
      version: versionId,
      created_at: results[0].created_at,
    };
  }

  getLatestData(): any {
    this.init();
    // Get the data from the latest version
    const latest = this.ctx.storage.sql
      .exec(
        "SELECT data, created_at, version FROM versions ORDER BY version DESC LIMIT 1"
      )
      .toArray();

    // If no versions exist, return null
    if (!latest || latest.length === 0) {
      return null;
    }

    // Parse the JSON data before returning
    return {
      ...JSON.parse(latest[0].data as string),
      lastSaved: latest[0].created_at,
      currentVersion: latest[0].version,
    };
  }

  getVersionHistory(): any {
    this.init();
    // Get last 14 days of versions
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const versions = this.ctx.storage.sql
      .exec(
        "SELECT version, created_at, data FROM versions WHERE created_at >= ? ORDER BY version DESC",
        [twoWeeksAgo.toISOString()]
      )
      .toArray();

    return versions.map((v) => ({
      version: v.version,
      created_at: v.created_at,
      data: JSON.parse(v.data as string),
    }));
  }
}

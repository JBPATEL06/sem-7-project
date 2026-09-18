import * as fs from 'fs';
import * as path from 'path';
import { IStore } from './IStore';

export class JsonStore<T extends { id: string }> implements IStore<T> {
  private filePath: string;

  constructor(filename: string) {
    this.filePath = path.join(process.cwd(), '.ai-manager', filename);
    this.ensureDirectoryExistence(this.filePath);
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]));
    }
  }

  private ensureDirectoryExistence(filePath: string) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
      return true;
    }
    this.ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
  }

  private async readData(): Promise<T[]> {
    try {
      const data = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      console.error(`Error reading ${this.filePath}:`, err);
      return [];
    }
  }

  private async writeData(data: T[]): Promise<void> {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`Error writing ${this.filePath}:`, err);
      throw err;
    }
  }

  async getAll(): Promise<T[]> {
    return await this.readData();
  }

  async getById(id: string): Promise<T | null> {
    const data = await this.readData();
    return data.find(item => item.id === id) || null;
  }

  async create(item: T): Promise<T> {
    const data = await this.readData();
    data.push(item);
    await this.writeData(data);
    return item;
  }

  async update(id: string, item: Partial<T>): Promise<T | null> {
    const data = await this.readData();
    const index = data.findIndex(i => i.id === id);
    if (index === -1) return null;
    
    data[index] = { ...data[index], ...item };
    await this.writeData(data);
    return data[index];
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.readData();
    const initialLength = data.length;
    const filtered = data.filter(item => item.id !== id);
    
    if (filtered.length === initialLength) return false;
    
    await this.writeData(filtered);
    return true;
  }
}

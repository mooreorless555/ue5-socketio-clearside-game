// export class ObservableMap<K, V> extends Map<K, V> {
//   private onAddCallback: (key: K, value: V) => void;
//   private onRemoveCallback: (key: K, value: V) => void;

//   constructor(config?: {
//     onAdd?: (key: K, value: V) => void;
//     onRemove?: (key: K, value: V) => void;
//   }) {
//     super();
//     this.onAddCallback = config?.onAdd || (() => {});
//     this.onRemoveCallback = config?.onRemove || (() => {});
//   }

//   set(key: K, value: V): this {
//     if (!this.has(key)) {
//       super.set(key, value);
//       this.onAddCallback(key, value);
//     } else {
//       super.set(key, value);
//     }
//     return this;
//   }

//   delete(key: K): boolean {
//     if (this.has(key)) {
//       const value = this.get(key)!;
//       const result = super.delete(key);
//       this.onRemoveCallback(key, value);
//       return result;
//     }
//     return false;
//   }

//   clear(): void {
//     const entries = Array.from(this.entries());
//     for (const [key, value] of entries) {
//       this.delete(key);
//     }
//   }
// }

export class ObservableMap<K, V> extends Map<K, V> {
  addCallbacks: Array<(key: K, value: V) => void> = [];
  removeCallbacks: Array<(key: K, value: V) => void> = [];

  set(key: K, value: V): this {
    if (!this.has(key)) {
      super.set(key, value);
      this.executeOnAddCallbacks(key, value);
    } else {
      super.set(key, value);
    }
    return this;
  }

  delete(key: K): boolean {
    if (this.has(key)) {
      const value = this.get(key)!;
      const result = super.delete(key);
      this.executeOnRemoveCallbacks(key, value);
      return result;
    }
    return false;
  }

  clear(): void {
    const entries = Array.from(this.entries());
    for (const [key, value] of entries) {
      this.delete(key);
    }
  }

  onAdd(callback: (key: K, value: V) => void) {
    this.addCallbacks.push(callback);
  }

  onRemove(callback: (key: K, value: V) => void) {
    this.removeCallbacks.push(callback);
  }

  getArrayValues() {
    return [...this.values()];
  }

  private executeOnAddCallbacks(key: K, value: V) {
    this.addCallbacks.forEach((callback) => callback(key, value));
  }
  private executeOnRemoveCallbacks(key: K, value: V) {
    this.removeCallbacks.forEach((callback) => callback(key, value));
  }
}

import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";

export interface FirestoreEmployee {
  id?: string;
  employeeCode: string;
  fullName: string;
  position: string;
  department: string;
  phone?: string;
  email?: string;
  gender?: string;
  idCardNumber?: string;
  idCardDate?: any;
  address?: string;
  startDate?: any;
  endDate?: any;
  status: string;
  createdAt?: any;
  updatedAt?: any;
}

const employeesCollection = collection(db, "employees");

export const firestoreEmployees = {
  async getAll() {
    const q = query(employeesCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirestoreEmployee[];
  },

  async getById(id: string) {
    const docRef = doc(db, "employees", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as FirestoreEmployee;
    }
    return null;
  },

  async create(data: Omit<FirestoreEmployee, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(employeesCollection, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<FirestoreEmployee>) {
    const docRef = doc(db, "employees", id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async delete(id: string) {
    const docRef = doc(db, "employees", id);
    await deleteDoc(docRef);
  },

  async count(filter?: { status?: string }) {
    let q = employeesCollection as any;
    if (filter?.status) {
      q = query(employeesCollection, where("status", "==", filter.status));
    }
    const snapshot = await getDocs(q);
    return snapshot.size;
  }
};

import {
  collection,
  doc,
  getDocs,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseDb } from "@/ptero/lib/firebase";

export type FirestoreCanteen = {
  id: string;
  name: string;
  location: string;
  hours: string;
};

export type FirestoreMenuItem = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
};

export async function fetchCanteens(
  db: Firestore = getFirebaseDb(),
): Promise<FirestoreCanteen[]> {
  const snap = await getDocs(collection(db, "canteens"));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: String(data.name ?? d.id),
      location: String(data.location ?? ""),
      hours: String(data.hours ?? ""),
    };
  });
}

export async function fetchCanteenMenu(
  canteenId: string,
  db: Firestore = getFirebaseDb(),
): Promise<FirestoreMenuItem[]> {
  const snap = await getDocs(collection(doc(db, "canteens", canteenId), "menu"));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: String(data.name ?? d.id),
      price: Number(data.price ?? 0),
      imageUrl: String(data.imageUrl ?? "https://via.placeholder.com/200"),
      category: String(data.category ?? "Mains"),
    };
  });
}

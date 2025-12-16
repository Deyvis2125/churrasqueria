// services/authService.js
import { auth, db } from '../firebase/config.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// 1. LOGIN
export async function loginUser(email, password) {
  try {
    // Autenticar
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Obtener rol de Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (!userDoc.exists()) {
      return {
        success: false,
        error: 'Usuario no encontrado'
      };
    }
    
    const userData = userDoc.data();
    
    return {
      success: true,
      user: user,
      role: userData.rol || 'cliente',
      userData: userData
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code || null
    };
  }
}

// 2. REGISTER  
export async function registerUser(email, password, nombre, rol = 'cliente') {
  try {
    // Crear usuario en Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Crear documento en Firestore
    await setDoc(doc(db, "users", user.uid), {
      email: email,
      nombre: nombre,
      rol: rol,
      fechaRegistro: new Date().toISOString()
    });
    
    return {
      success: true,
      user: user,
      role: rol
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code || null
    };
  }
}

// 3. OBTENER ROL (útil para componentes)
export async function getUserRole(uid) {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    
    if (userDoc.exists()) {
      return userDoc.data().rol || 'cliente';
    }
    return 'cliente'; // Rol por defecto
    
  } catch (error) {
    console.error('Error obteniendo rol:', error);
    return 'cliente';
}
}   
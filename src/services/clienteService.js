import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const clientesCollection = collection(db, 'clientes');

/**
 * Busca un cliente en la colección 'clientes' por su número de documento (DNI o RUC).
 * @param {string} documento - El DNI o RUC a buscar.
 * @returns {Promise<Object|null>} - Retorna el objeto del cliente si se encuentra, o null si no existe.
 */
export const findClienteByDocument = async (documento) => {
  if (!documento) return null;

  try {
    const clienteDocRef = doc(clientesCollection, documento);
    const clienteSnap = await getDoc(clienteDocRef);

    if (clienteSnap.exists()) {
      // Retorna los datos del cliente encontrado
      return { id: clienteSnap.id, ...clienteSnap.data() };
    } else {
      // No se encontró el cliente
      return null;
    }
  } catch (error) {
    console.error("Error al buscar cliente:", error);
    // En caso de error, asumimos que no se encontró para no bloquear el flujo.
    return null; 
  }
};

/**
 * Crea o actualiza un cliente en la colección 'clientes'.
 * @param {string} documento - El DNI o RUC del cliente.
 * @param {Object} data - Los datos a guardar (ej: { nombreCompleto: '...' } o { razonSocial: '...' }).
 * @returns {Promise<void>}
 */
export const createOrUpdateCliente = async (documento, data) => {
  if (!documento || !data) return;

  try {
    const clienteDocRef = doc(clientesCollection, documento);
    // setDoc con { merge: true } crea el documento si no existe, o actualiza los campos si ya existe.
    await setDoc(clienteDocRef, data, { merge: true });
  } catch (error) {
    console.error("Error al crear o actualizar cliente:", error);
    // Opcional: lanzar el error para que el componente que llama lo maneje.
    throw error;
  }
};

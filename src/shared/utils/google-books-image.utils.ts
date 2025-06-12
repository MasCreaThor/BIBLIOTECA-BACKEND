// src/shared/utils/google-books-image.utils.ts
import { GoogleBooksVolumeDto } from '@modules/resource/dto/google-books/google-books.dto';

/**
 * Utilidades para manejar imágenes de Google Books
 */
export class GoogleBooksImageUtils {
  
  /**
   * Obtiene la URL de imagen de mejor calidad disponible
   * Prioridad: large > medium > small > thumbnail
   */
  static getBestImageUrl(volume: GoogleBooksVolumeDto): string | null {
    if (!volume.imageLinks) {
      return null;
    }

    const { large, medium, small, thumbnail } = volume.imageLinks;

    // Retornar la imagen de mayor calidad disponible
    return large || medium || small || thumbnail || null;
  }

  /**
   * Obtiene una URL de imagen específica por tamaño
   */
  static getImageBySize(
    volume: GoogleBooksVolumeDto, 
    size: 'thumbnail' | 'small' | 'medium' | 'large'
  ): string | null {
    if (!volume.imageLinks) {
      return null;
    }

    return volume.imageLinks[size] || null;
  }

  /**
   * Verifica si el volumen tiene al menos una imagen disponible
   */
  static hasImage(volume: GoogleBooksVolumeDto): boolean {
    if (!volume.imageLinks) {
      return false;
    }

    const { thumbnail, small, medium, large } = volume.imageLinks;
    return !!(thumbnail || small || medium || large);
  }

  /**
   * Obtiene todas las URLs de imagen disponibles
   */
  static getAllImageUrls(volume: GoogleBooksVolumeDto): {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  } | null {
    if (!volume.imageLinks) {
      return null;
    }

    return {
      thumbnail: volume.imageLinks.thumbnail,
      small: volume.imageLinks.small,
      medium: volume.imageLinks.medium,
      large: volume.imageLinks.large,
    };
  }

  /**
   * Convierte HTTP a HTTPS si es necesario (Google Books a veces retorna HTTP)
   */
  static ensureHttps(imageUrl: string | null): string | null {
    if (!imageUrl) {
      return null;
    }

    // Convertir HTTP a HTTPS para mejor seguridad
    return imageUrl.replace(/^http:\/\//, 'https://');
  }

  /**
   * Obtiene la mejor URL de imagen con HTTPS garantizado
   */
  static getBestImageUrlSecure(volume: GoogleBooksVolumeDto): string | null {
    const bestUrl = this.getBestImageUrl(volume);
    return this.ensureHttps(bestUrl);
  }

  /**
   * Valida que la URL de imagen sea válida y accesible
   */
  static isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Verificar que sea HTTP/HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // Verificar que parezca ser una imagen (extensión común o dominio conocido)
      const isGoogleBooks = urlObj.hostname.includes('googleapis.com') || 
                           urlObj.hostname.includes('googleusercontent.com');
      
      const hasImageExtension = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
      
      return isGoogleBooks || hasImageExtension;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene información detallada sobre las imágenes disponibles
   */
  static getImageInfo(volume: GoogleBooksVolumeDto): {
    hasImages: boolean;
    availableSizes: string[];
    bestUrl: string | null;
    secureUrl: string | null;
    allUrls: Record<string, string>;
  } {
    const hasImages = this.hasImage(volume);
    const availableSizes: string[] = [];
    const allUrls: Record<string, string> = {};

    if (volume.imageLinks) {
      Object.entries(volume.imageLinks).forEach(([size, url]) => {
        if (url) {
          availableSizes.push(size);
          allUrls[size] = url;
        }
      });
    }

    return {
      hasImages,
      availableSizes,
      bestUrl: this.getBestImageUrl(volume),
      secureUrl: this.getBestImageUrlSecure(volume),
      allUrls,
    };
  }
}
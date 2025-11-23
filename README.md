
# Boriel Basic Language Server (LSP)

Este proyecto implementa un servidor de lenguaje (LSP) para el dialecto Boriel Basic, proporcionando soporte avanzado de edición en editores compatibles (VS Code, NeoVim, etc).

## Funcionalidades principales

- **Autocompletado inteligente**: Sugerencias de palabras clave, funciones, variables, constantes y macros, incluyendo funciones definidas por el usuario y funciones integradas.
- **Ir a la definición**: Navega rápidamente a la declaración de funciones, subrutinas, variables, constantes y macros.
- **Documentación al pasar el ratón (hover)**: Muestra la cabecera y documentación de funciones, subrutinas y palabras clave, incluyendo resaltado de sintaxis Boriel Basic en el popup.
- **Ayuda de firma (signature help)**: Al escribir una llamada a función, muestra los parámetros esperados y el tipo de retorno.
- **Resaltado semántico**: Colorea sintácticamente palabras clave, tipos, funciones, variables, constantes, comentarios, cadenas y tokens compuestos (como `END FUNCTION`).
- **Formato e indentación automática**: Aplica reglas de indentación y formato, con excepciones para estructuras de control en una sola línea (por ejemplo, `Do ... Loop`, `While ... Wend`, `If ... Then`).
- **Soporte para funciones integradas**: Incluye documentación y navegación para funciones internas como `paintData`, aunque no estén definidas en el código fuente del usuario.
- **Reconocimiento de arrays y tipos**: Detecta variables y arrays multidimensionales, mostrando correctamente sus tipos y dimensiones.
- **Soporte multiplataforma**: Manejo robusto de rutas y URIs para funcionar correctamente en Windows, Linux y Mac.

## Instalación y uso

1. Clona este repositorio y ejecuta `npm install` para instalar dependencias.
2. Usa `npm link` para enlazar el servidor localmente si desarrollas una extensión de editor.
3. Configura tu editor para usar este LSP apuntando al ejecutable `main.js`.

## Estado actual

- El servidor está en desarrollo activo. Se recomienda reiniciar el servidor tras cambios en el código fuente.
- Para soporte de nuevas palabras clave, funciones o reglas de formato, abre un issue o contribuye con un PR.

---

[Repositorio Boriel Basic](https://github.com/boriel-basic/zxbasic)
export const AppFooter = () => (
  <footer className="app-footer">
    <div className="app-footer__inner">
      <div>
        <strong>Progression Finder</strong> &copy; {new Date().getFullYear()}
      </div>
      <div>
        Desarrollado con React, TypeScript y Tone.js para una experiencia
        auditiva interactiva.
      </div>
      <div>
        Autor{' '}
        <a
          target="_blank"
          rel="noreferrer"
          href="https://www.instagram.com/estebanfunkmasta/"
        >
          @EstebanFunkmasta
        </a>
        {' · '}
        <a
          target="_blank"
          rel="noreferrer"
          href="https://github.com/estebanzen/progression-finder"
        >
          GitHub
        </a>
      </div>
    </div>
  </footer>
);

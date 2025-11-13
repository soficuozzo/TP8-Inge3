// cypress/e2e/tasks_integration.cy.js
describe('TP7 - Pruebas de Integración CRUD de Tareas', () => {

  // 👇 Si existen variables de entorno en Azure, las usa. Si no, usa valores por defecto (local).
  const FRONT_URL = Cypress.env('FRONT_URL') || 'http://localhost:3000';
  const API_URL = Cypress.env('API_URL') || 'http://localhost:8080/api/tasks';

  it('Carga correctamente la página principal', () => {
    cy.visit(FRONT_URL);
    cy.contains('Lista de Tareas').should('be.visible');
  });

  it('Crea una nueva tarea y la muestra en pantalla', () => {
    cy.request('POST', API_URL, { title: 'Tarea Cypress', description: 'Creada automáticamente' });
    cy.visit(FRONT_URL);
    cy.contains('Tarea Cypress').should('be.visible');
  });

  it('Edita una tarea existente', () => {
    cy.request('POST', API_URL, { title: 'Tarea para editar', description: 'Antes de editar' })
      .then(response => {
        const id = response.body._id;
        cy.request('PUT', `${API_URL}/${id}`, { title: 'Tarea editada', description: 'Actualizada por Cypress' });
        cy.visit(FRONT_URL);
        cy.contains('Tarea editada').should('be.visible');
      });
  });

  it('Marca una tarea como completada y la muestra con estilo aplicado', () => {
    cy.request('POST', API_URL, { title: 'Tarea a completar', completed: false })
      .then(response => {
        const id = response.body._id;
        cy.request('PUT', `${API_URL}/${id}`, { completed: true });
        cy.visit(FRONT_URL);
        cy.contains('Tarea a completar').parent().should('have.class', 'completed');
      });
  });

  it('Elimina una tarea correctamente', () => {
    cy.request('POST', API_URL, { title: 'Tarea a eliminar' })
      .then(response => {
        const id = response.body._id;
        cy.request('DELETE', `${API_URL}/${id}`);
        cy.visit(FRONT_URL);
        cy.contains('Tarea a eliminar').should('not.exist');
      });
  });

});

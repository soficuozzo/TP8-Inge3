describe('TP8 - Pruebas de Integración CRUD de Tareas', () => {

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
  cy.request('POST', API_URL, { title: 'Tarea a completar', status: 'pending' })
    .then(response => {
      const id = response.body._id;

      // Cambiar estado en backend
      cy.request('PUT', `${API_URL}/${id}/status`, { status: 'completed' });

      cy.visit(FRONT_URL);

      // Esperar a que aparezca la tarea
      cy.get('#tasksList', { timeout: 8000 })
        .find('.task-item, .empty-state')
        .should('exist');

      // Esperar a que la UI recargue
      cy.contains('Tarea a completar')
        .parents('.task-item')
        .should('have.class', 'completed');
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

describe('TP8 - Funcionalidades extendidas de la App de Tareas', () => {

  const FRONT_URL = Cypress.env('FRONT_URL') || 'http://localhost:3000';
  const API_URL = Cypress.env('API_URL') || 'http://localhost:8080/api/tasks';

  beforeEach(() => {
    cy.visit(FRONT_URL);
  });

  // -----------------------------------------------------
  // 1) Crear tarea con prioridad ALTA y verificar badge
  // -----------------------------------------------------
  it('Crea una tarea con prioridad alta y la muestra correctamente', () => {
    cy.request('POST', API_URL, {
      title: 'Prioridad Alta Test',
      description: 'Descripción',
      priority: 'high'
    });

    cy.visit(FRONT_URL);
    cy.contains('Prioridad Alta Test')
      .parents('.task-item')
      .find('.badge-priority-high')
      .should('exist')
      .and('contain', 'Alta');
  });

  // -----------------------------------------------------
  // 2) Crear tarea con fecha límite y verificar que aparece
  // -----------------------------------------------------
  it('Crea una tarea con fecha límite y la muestra en la UI', () => {
    cy.request('POST', API_URL, {
      title: 'Tarea con fecha',
      description: 'Tiene fecha límite',
      dueDate: '2030-05-20'
    });

    cy.visit(FRONT_URL);

    cy.get('#tasksList', { timeout: 8000 })
      .find('.task-item')
      .should('exist');

    cy.get('.task-item').first()
      .find('.badge-due-normal')
      .should('contain', '2030')
      .and('contain', '20');
  });

  // -----------------------------------------------------
  // 3) Usar el buscador para filtrar tareas por título
  // -----------------------------------------------------
  it('Filtra tareas correctamente usando el buscador', () => {
    cy.request('POST', API_URL, { title: 'BuscarA' });
    cy.request('POST', API_URL, { title: 'BuscarB' });

    cy.visit(FRONT_URL);

    cy.get('#search').type('BuscarA');
    cy.contains('🔍 Buscar').click();

    cy.contains('BuscarA').should('exist');
    cy.contains('BuscarB').should('not.exist');
  });

  // -----------------------------------------------------
  // 4) Verificar estadísticas: total/completadas/pending/cancelled
  // -----------------------------------------------------
  it('Actualiza correctamente las estadísticas', () => {
    // Creamos 3 tareas nuevas
    cy.request('POST', API_URL, { title: 'Pendiente', status: 'pending' });
    cy.request('POST', API_URL, { title: 'Completa 1', status: 'completed' });
    cy.request('POST', API_URL, { title: 'Completa 2', status: 'completed' });

    // Cargamos la UI
    cy.visit(FRONT_URL);

    // Obtenemos stats REALES de la API
    cy.request(`${API_URL}/stats`).then(apiRes => {
      const apiStats = apiRes.body;

      cy.get('#stats', { timeout: 15000 })
        .invoke('text')
        .should(text => {
          expect(text).to.include('Total');
          expect(text).to.include('Pendientes');
          expect(text).to.include('Completadas');
          expect(text).to.include('Canceladas');

          // Matchea valores REALES
          expect(text).to.include(`Total: ${apiStats.total}`);
          expect(text).to.include(`Pendientes: ${apiStats.pending}`);
          expect(text).to.include(`Completadas: ${apiStats.completed}`);
          expect(text).to.include(`Canceladas: ${apiStats.cancelled}`);
        });
    });
});




  // -----------------------------------------------------
  // 5) Cambiar estado desde los botones de la UI
  // -----------------------------------------------------
  it('Cambia el estado de una tarea desde la UI', () => {
    cy.request('POST', API_URL, {
      title: 'Cambiar estado UI',
      status: 'pending'
    });

    cy.visit(FRONT_URL);

    cy.contains('Cambiar estado UI')
      .parents('.task-item')
      .find('.btn-success')
      .click();

    cy.contains('Cambiar estado UI')
      .parents('.task-item')
      .should('have.class', 'completed');
  });

  // -----------------------------------------------------
  // 6) Editar una tarea desde el modal
  // -----------------------------------------------------
  it('Edita una tarea desde el formulario modal', () => {
    cy.request('POST', API_URL, { title: 'Editar Modal', description: 'Vieja desc' })
      .then(res => {
        cy.visit(FRONT_URL);

        cy.contains('Editar Modal')
          .parents('.task-item')
          .find('button')
          .contains('Editar')
          .click();

        cy.get('#editTitle').clear().type('Editada por Cypress');
        cy.contains('Guardar').click();

        cy.contains('Editada por Cypress').should('be.visible');
      });
  });

  // -----------------------------------------------------
  // 7) Cancelar una tarea y mostrar badge rojo
  // -----------------------------------------------------
  it('Marca una tarea como cancelada y muestra el estilo correspondiente', () => {
    cy.request('POST', API_URL, {
      title: 'Cancelar Test',
      status: 'pending'
    }).then(res => {
      const id = res.body._id;

      cy.request('PUT', `${API_URL}/${id}/status`, { status: 'cancelled' });

      cy.visit(FRONT_URL);

      cy.contains('Cancelar Test')
        .parents('.task-item')
        .should('have.class', 'cancelled');
    });
  });

});


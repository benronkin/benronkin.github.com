import { getWebAppData, postWebApp } from './io.js'
import { resizeTextarea } from './ui.js'
import { state } from './state.js'

// ----------------------
// Globals
// ----------------------

const addRecipeBtn = document.querySelector('#add-recipe')
const searchRecipesEl = document.querySelector('#search-recipes')
const recipesContainer = document.querySelector('#recipes-container')
const recipesList = document.querySelector('#recipes-list')
const recipeEl = document.querySelector('#recipe')
const recipeTitleEl = document.querySelector('#recipe-title')
const recipeIngredients = document.querySelector('#recipe-ingredients')
const recipeMethod = document.querySelector('#recipe-method')
const recipeNotes = document.querySelector('#recipe-notes')
const recipeCategory = document.querySelector('#recipe-category')
const recipeTags = document.querySelector('#recipe-tags')
const recipeIdEl = document.querySelector('#recipe-id')

// ----------------------
// Exported functions
// ----------------------

/**
 * Set recipe event listeners
 */
export async function initRecipes() {
  /* When recipes container is populated */
  recipesContainer.addEventListener('recipes-loaded', () => {
    handleRecipeContainerPopulated()
  })

  /* When add recipe button is clicked */
  addRecipeBtn.addEventListener('click', async () => {
    await handleRecipeCreate()
  })

  /* When search recipes input key down */
  searchRecipesEl.addEventListener('keydown', async (e) => {
    await handleRecipeSearch(e)
  })

  /* When recipe field loses focus */
  document.querySelectorAll('.field').forEach((field) => {
    field.addEventListener('change', (e) => {
      handleFieldChange(e.target)
    })
  })

  const { recipes, error } = await getLatestRecipes()

  if (error) {
    document.dispatchEvent(new CustomEvent('recipes-fetch-fail'))
    return
  }
  state.setRecipes(recipes)
  populateRecipes()
}

// ------------------------
// Event handler functions
// ------------------------

/**
 * Handle recipe container populated
 */
function handleRecipeContainerPopulated() {
  const recipeLinks = document.querySelectorAll('.recipe-link')
  for (const recipeLink of recipeLinks) {
    recipeLink.addEventListener('click', async (e) => {
      handleRecipeLinkClick(e.target)
    })
  }
}

/**
 * Handle recipe create
 */
async function handleRecipeCreate() {
  addRecipeBtn.disabled = true
  addRecipeBtn.textContent = 'Creating...'
  const { id } = await getWebAppData(`${state.getWebAppUrl()}?path=recipe-create`)

  const newRecipe = {
    id,
    title: 'New Recipe',
    ingredients: '',
    method: '',
    notes: '',
    category: '',
    tags: ''
  }
  state.addRecipe(newRecipe)
  const li = document.createElement('li')
  li.textContent = newRecipe.title
  li.classList.add('recipe-link')
  li.dataset.id = newRecipe.id
  recipesList.appendChild(li)
  li.addEventListener('click', () => {
    handleRecipeLinkClick(li)
  })
  li.click()
  addRecipeBtn.disabled = false
  addRecipeBtn.textContent = 'NEW RECIPE'
}

/**
 * Handle recipe search
 */
async function handleRecipeSearch(e) {
  if (e.key !== 'Enter') {
    return
  }
  const value = e.target.value.toLowerCase().trim()
  if (value.length === 0) {
    return
  }
  const { recipes } = await getSearchedRecipes(value)
  state.setRecipes(recipes)
  populateRecipes()
}

/**
 * Handle recipe field change
 */
async function handleFieldChange(elem) {
  const recipeSection = elem.id.replace('recipe-', '')
  if (recipeSection === 'title') {
    document.querySelector('.tab.active').querySelector('.text-tab').textContent = elem.value
    document.querySelector('.recipe-link.active').textContent = elem.value
  }
  const id = recipeIdEl.textContent

  state.setRecipeSection(id, recipeSection, elem.value)

  try {
    const { message, error } = await postWebApp(state.getWebAppUrl(), {
      path: 'recipe-update',
      id,
      value: elem.value,
      section: recipeSection
    })
    if (error) {
      throw new Error(error)
    }
    console.log(message)
  } catch (err) {
    console.log(err)
  }
}

/**
 * Handle recipe link click
 */
async function handleRecipeLinkClick(elem) {
  document.querySelector('.recipe-link.active')?.classList.remove('active')
  elem.classList.add('active')
  const recipeId = elem.dataset.id
  const recipe = state.getRecipeById(recipeId)
  if (!recipe) {
    console.log(`handleRecipeLinkClick error: Recipe not found for id: ${recipeId}`)
    console.log('recipes:', state.getRecipes())
    return
  }

  loadRecipe(recipe)
  const { message, error } = await postWebApp(state.getWebAppUrl(), {
    path: 'recipe-access',
    id: recipeId
  })
  if (error) {
    console.log(error)
  }
  console.log(message)
}

/**
 * Handle tab click
 */
function handleTabClick(elem) {
  const recipeId = elem.id.replace('tab-', '')
  const recipe = state.getRecipeById(recipeId)

  document.querySelector('.recipe-link.active').classList.remove('active')
  document.querySelector(`.recipe-link[data-id="${recipeId}"]`).classList.add('active')

  loadRecipe(recipe)
}

/**
 * Handle tab close click
 */
function handleTabCloseClick(tab) {
  tab.remove()
  const activeTab = document.querySelector('.tab.active')
  if (!activeTab) {
    document.querySelector('.recipe-link.active').classList.remove('active')
    const firstTab = document.querySelector('.tab')
    if (firstTab) {
      const firstTabId = firstTab.id.replace('tab-', '')
      document.querySelector(`.recipe-link[data-id="${firstTabId}"]`).click()
    } else {
      recipeEl.classList.add('hidden')
    }
  }
}

// ------------------------
// Helper functions
// ------------------------

/**
 * Get the latest recipes
 */
async function getLatestRecipes() {
  const { recipes, token, error } = await getWebAppData(`${state.getWebAppUrl()}?path=recipes`)
  if (error) {
    console.log(`getLatestRecipes error: ${error}`)
    return { error }
  }
  if (token) {
    localStorage.setItem('token', token)
  }
  return recipes
}

/**
 * Populate the recipes list
 */
function populateRecipes() {
  const recipes = state.getRecipes()
  if (!recipes) {
    console.log(`populateRecipes error: state does not have recipes: ${recipes}`)
    return
  }

  recipesContainer.classList.remove('hidden')
  recipesList.innerHTML = ''
  for (const recipe of recipes) {
    const li = document.createElement('li')
    li.textContent = recipe.title
    li.classList.add('recipe-link')
    li.dataset.id = recipe.id
    recipesList.appendChild(li)
  }
  recipesContainer.dispatchEvent(new CustomEvent('recipes-loaded'))
}

/**
 * Load the recipe object to the page
 */
function loadRecipe(recipe) {
  const activeTab = document.querySelector('.tab.active')
  if (activeTab) {
    activeTab.classList.remove('active')
  }
  const tabId = `tab-${recipe.id}`
  let tab = document.querySelector(`#${tabId}`)
  if (!tab) {
    tab = document.createElement('div')
    tab.id = tabId
    tab.classList.add('tab')
    tab.classList.add('active')
    tab.innerHTML = `<span class="text-tab">${recipe.title}</span> <i class="close-tab fa-regular fa-circle-xmark"></i>`
    document.querySelector('#tabs').appendChild(tab)
    tab.querySelector('.text-tab').addEventListener('click', (e) => {
      handleTabClick(tab)
    })
    tab.querySelector('.close-tab').addEventListener('click', (e) => {
      e.stopPropagation()
      handleTabCloseClick(tab)
    })
  }
  tab.classList.add('active')
  recipeEl.classList.remove('hidden')
  recipeTitleEl.value = recipe.title
  recipeIngredients.value = recipe.ingredients
  resizeTextarea(recipeIngredients)
  recipeMethod.value = recipe.method
  resizeTextarea(recipeMethod)
  recipeNotes.value = recipe.notes
  resizeTextarea(recipeNotes)
  recipeCategory.value = recipe.category || ''
  resizeTextarea(recipeCategory)
  recipeTags.value = recipe.tags
  resizeTextarea(recipeTags)
  recipeIdEl.textContent = recipe.id
}

/**
 * Get the searched recipes
 */
async function getSearchedRecipes(q) {
  const { recipes, token, error } = await getWebAppData(`${state.getWebAppUrl()}?path=recipes&q=${q}`)
  if (error) {
    console.log(`getSearchedRecipes error: ${error}`)
    return { error }
  }
  return recipes
}

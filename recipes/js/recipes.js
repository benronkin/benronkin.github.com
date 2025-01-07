import { getWebAppData, postWebApp } from './io.js'
import { state } from './state.js'

const addRecipeBtn = document.querySelector('#add-recipe')
const searchRecipesEl = document.querySelector('#search-recipes')
const recipesContainer = document.querySelector('#recipes-container')
const recipeLinksPanel = document.querySelector('#recipe-links-panel')
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
export function setRecipeEventListeners() {
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
}

/**
 * Populate the recipes list
 */
export function populateRecipes() {
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
export function loadRecipe(recipe) {
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

/**
 * Resize the textarea
 */
function resizeTextarea(textarea) {
  // First, set the textarea to the default height
  textarea.style.height = 'auto'
  textarea.style.height = '0'

  // Get the scroll height of the textarea content
  let minHeight = textarea.scrollHeight

  // If the scroll height is more than the default height, expand the textarea
  if (minHeight > textarea.clientHeight) {
    textarea.style.height = minHeight + 10 + 'px'
  }
}

// Test file for AST analysis
// This file contains various JavaScript patterns to test feature extraction

// 1. Async/await pattern
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}

// 2. Promise chain pattern
function loadData() {
  return fetch('/api/data')
    .then(response => response.json())
    .then(data => {
      console.log('Data loaded:', data);
      return data;
    })
    .catch(error => {
      console.error('Error loading data:', error);
    });
}

// 3. Array methods
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
const evens = doubled.filter(n => n % 2 === 0);
const sum = evens.reduce((a, b) => a + b, 0);

// 4. Class with inheritance
class Animal {
  constructor(name) {
    this.name = name;
  }
  
  speak() {
    console.log(`${this.name} makes a sound`);
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }
  
  speak() {
    console.log(`${this.name} barks`);
  }
  
  wagTail() {
    console.log(`${this.name} wags tail`);
  }
}

// 5. Destructuring
const { name, age, ...rest } = person;
const [first, second, ...others] = numbers;

function processUser({ id, email, profile: { firstName, lastName } }) {
  return `${firstName} ${lastName} (${email})`;
}

// 6. Higher-order function
const createMultiplier = (factor) => {
  return (number) => number * factor;
};

const double = createMultiplier(2);
const triple = createMultiplier(3);

// 7. Event handling pattern
document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('#submit-btn');
  
  button.addEventListener('click', async (event) => {
    event.preventDefault();
    
    const formData = new FormData(event.target.form);
    const response = await submitForm(formData);
    
    if (response.ok) {
      showSuccess('Form submitted successfully!');
    } else {
      showError('Failed to submit form');
    }
  });
});

// 8. Generator function
function* fibonacci(n) {
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    yield a;
    [a, b] = [b, a + b];
  }
}

// 9. Complex conditional logic
function categorizeAge(age) {
  if (age < 0) {
    return 'invalid';
  } else if (age < 13) {
    return 'child';
  } else if (age < 20) {
    return 'teenager';
  } else if (age < 60) {
    return 'adult';
  } else {
    return 'senior';
  }
}
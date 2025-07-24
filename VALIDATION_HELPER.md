# Zod Field Helpers Usage

## Basic Syntax
```typescript
field.[type]("Field Name", options)
```

## Available Field Types
```typescript
// String field
field.string("Name", { 
  required?: boolean,
  min?: number,
  max?: number,
  messages?: { /* custom messages */ }
})

// Email field  
field.email("Email", {
  required?: boolean,
  messages?: { /* custom messages */ }
})

// URL field
field.url("Website", {
  required?: boolean, 
  messages?: { /* custom messages */ }
})

// Number field
field.number("Age", {
  required?: boolean,
  min?: number,
  max?: number,
  messages?: { /* custom messages */ }
})

// Password field (always required)
field.password("Password", {
  messages?: { /* custom messages */ }
})
```

## Example Usage with Custom Messages
```typescript
const userSchema = z.object({
  username: field.string("Username", {
    min: 3,
    messages: {
      required: "Username is required",
      min: "Username must be at least 3 characters"
    }
  }),
  
  email: field.email("Email", {
    messages: {
      invalid: "Please enter a valid email address"
    }
  }),
  
  age: field.number("Age", {
    min: 18,
    messages: {
      min: "You must be at least 18 years old"
    }
  }),
  
  password: field.password("Password", {
    messages: {
      uppercase: "Must contain at least one uppercase letter",
      special: "Must include a special character (!@#$)"
    }
  })
});
```
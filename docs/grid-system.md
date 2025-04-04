# Grid System Guidelines

This document outlines how to properly use the grid system in the Open Libra Explorer project to ensure consistent layouts across all screen sizes.

## Core Components

### Container

The `Container` component creates a centered, width-constrained wrapper for content. It helps maintain consistent horizontal padding and maximum width across the application.

```tsx
import { Container } from '../components/Layout';

// Basic usage
<Container>
  {/* Your content */}
</Container>

// With custom width
<Container width="xl">
  {/* Your content with larger max width */}
</Container>

// Full width without centering
<Container width="full" centered={false}>
  {/* Full width content */}
</Container>
```

#### Properties

- `width`: Controls the maximum width of the container
  - `sm`: 640px
  - `md`: 768px
  - `lg`: 1024px (default)
  - `xl`: 1280px
  - `2xl`: 1536px
  - `full`: No max width
- `centered`: Whether to center the container (defaults to true)
- `className`: Additional Tailwind classes

### Grid

The `Grid` component provides a responsive grid layout system with configurable columns for different screen sizes.

```tsx
import { Grid } from '../components/Layout';

// Basic usage
<Grid cols={1} mdCols={2} lgCols={3} gap={4}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>

// With container control
<Grid 
  cols={1} 
  mdCols={2} 
  lgCols={3} 
  gap={4}
  containerWidth="xl"
  fullBleed={false}
>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>
```

#### Properties

- `cols`: Number of columns on smallest screens (defaults to 1)
- `smCols`: Number of columns on small screens
- `mdCols`: Number of columns on medium screens (defaults to 2)
- `lgCols`: Number of columns on large screens (defaults to 3)
- `xlCols`: Number of columns on extra large screens
- `gap`: Space between grid items (defaults to 4)
- `containerWidth`: Sets the container width (same options as Container)
- `fullBleed`: Whether to extend to the edges of the container
- `centered`: Whether to center the grid (defaults to true)

### TwoColumn

The `TwoColumn` component creates a responsive two-column layout that can stack on mobile screens.

```tsx
import { TwoColumn } from '../components/Layout';

<TwoColumn 
  leftWidth="w-full md:w-1/3" 
  rightWidth="w-full md:w-2/3"
  spacing="space-y-4 md:space-y-0 md:space-x-8"
>
  <LeftColumnContent />
  <RightColumnContent />
</TwoColumn>
```

#### Properties

- `leftWidth`: Width class for the left column (defaults to 'w-full md:w-1/3')
- `rightWidth`: Width class for the right column (defaults to 'w-full md:w-2/3')
- `spacing`: Classes for controlling spacing (defaults to 'space-y-4 md:space-y-0 md:space-x-4')
- `stackOnMobile`: Whether to stack on mobile screens (defaults to true)

## Best Practices

### 1. Use the Container Component at the Page Level

Always wrap your page content in a Container component to ensure consistent max width constraints:

```tsx
// Example page component
export default function MyPage() {
  return (
    <View className="bg-background flex-1">
      <Container>
        {/* Page content */}
      </Container>
    </View>
  );
}
```

### 2. Use Grid for Multi-Column Layouts

Prefer the Grid component over ad-hoc column implementations:

```tsx
// Good
<Grid cols={1} mdCols={2} lgCols={3} gap={4}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>

// Avoid
<View className="flex flex-col md:flex-row md:flex-wrap">
  <View className="w-full md:w-1/2 lg:w-1/3 p-2">
    <Card>Item 1</Card>
  </View>
  <View className="w-full md:w-1/2 lg:w-1/3 p-2">
    <Card>Item 2</Card>
  </View>
  <View className="w-full md:w-1/2 lg:w-1/3 p-2">
    <Card>Item 3</Card>
  </View>
</View>
```

### 3. Use Mobile-First Approach

Design for mobile first, then enhance for larger screens:

```tsx
// In components, avoid direct width classes without responsive prefixes
<View className="w-64" /> // Avoid - fixed width on all screens

// Instead, use responsive classes:
<View className="w-full sm:w-64" /> // Better - full width on mobile, 16rem on larger screens
```

### 4. Consistent Spacing

Use the spacing system through the gap property rather than manual padding:

```tsx
// Good
<Grid gap={4}>
  {/* Items */}
</Grid>

// Avoid
<View>
  <View className="p-4">Item 1</View>
  <View className="p-4">Item 2</View>
</View>
```

### 5. Let Container Handle Maximum Width

Components should not include max-width constraints - these should be handled by Container or Grid components:

```tsx
// Good
<Container>
  <MyComponent />
</Container>

// Avoid
<MyComponent className="max-w-screen-lg mx-auto" />
```

## Examples

### Page Layout with Sidebar

```tsx
<Container>
  <TwoColumn 
    leftWidth="w-full md:w-1/4" 
    rightWidth="w-full md:w-3/4"
  >
    <Sidebar />
    <MainContent />
  </TwoColumn>
</Container>
```

### Card Grid

```tsx
<Container>
  <Grid 
    cols={1} 
    mdCols={2} 
    lgCols={3} 
    xlCols={4} 
    gap={6}
  >
    <Card>Card 1</Card>
    <Card>Card 2</Card>
    <Card>Card 3</Card>
    <Card>Card 4</Card>
  </Grid>
</Container>
```

### Form Layout

```tsx
<Container width="md">
  <Grid cols={1} gap={4}>
    <InputField label="Name" />
    <TwoColumn>
      <InputField label="First Name" />
      <InputField label="Last Name" />
    </TwoColumn>
    <Button>Submit</Button>
  </Grid>
</Container>
```

By following these guidelines, we'll maintain a consistent, responsive layout throughout the application. 
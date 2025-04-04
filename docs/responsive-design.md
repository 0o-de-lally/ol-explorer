# Responsive Design Guidelines for Open Libra Explorer

## Core Principles

1. **Use Native Responsive Classes**: Always use NativeWind/Tailwind CSS responsive prefixes (`sm:`, `md:`, `lg:`) instead of manually checking screen dimensions.

2. **Mobile-First Approach**: Start with mobile styling and add responsive modifiers for larger screens.

3. **Avoid Manual Dimension Checks**: Don't use `useWindowDimensions` to conditionally render different layouts or components.

4. **Use Layout Components**: Use our responsive layout components (`Container`, `TwoColumn`, `Grid`, etc.) which are designed to handle responsiveness properly.

## Breakpoints

The project uses the standard Tailwind CSS breakpoints:

- `sm`: 640px and up
- `md`: 768px and up
- `lg`: 1024px and up
- `xl`: 1280px and up
- `2xl`: 1536px and up

## Examples

### ❌ Incorrect Approach (Avoid This)

```tsx
import { useWindowDimensions } from 'react-native';

const MyComponent = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View>
      {isMobile ? (
        <Text>Mobile View</Text>
      ) : (
        <Text>Desktop View</Text>
      )}
    </View>
  );
};
```

### ✅ Correct Approach (Use This)

```tsx
const MyComponent = () => {
  return (
    <View>
      <Text className="block md:hidden">Mobile View</Text>
      <Text className="hidden md:block">Desktop View</Text>
    </View>
  );
};
```

## Making Components Responsive

### Responsive Width

```tsx
<View className="w-full md:w-1/2 lg:w-1/3">
  {/* Content that takes full width on mobile, half on tablet, third on desktop */}
</View>
```

### Responsive Flexbox Layout

```tsx
<View className="flex flex-col md:flex-row">
  <View className="w-full md:w-1/3">
    {/* Left column */}
  </View>
  <View className="w-full md:w-2/3">
    {/* Right column */}
  </View>
</View>
```

### Responsive Grid

```tsx
<View className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <View key={item.id}>
      {/* Grid item */}
    </View>
  ))}
</View>
```

### Responsive Spacing

```tsx
<View className="p-3 md:p-4 lg:p-6">
  {/* Content with different padding based on screen size */}
</View>
```

### Responsive Typography

```tsx
<Text className="text-base md:text-lg lg:text-xl">
  {/* Text that changes size based on screen width */}
</Text>
```

## Using Layout Components

### Container

```tsx
<Container>
  {/* Content with responsive max-width */}
</Container>
```

### TwoColumn

```tsx
<TwoColumn
  leftWidth="w-full md:w-1/3"
  rightWidth="w-full md:w-2/3"
  spacing="space-y-4 md:space-y-0 md:space-x-4"
>
  <View>
    {/* Left column content */}
  </View>
  <View>
    {/* Right column content */}
  </View>
</TwoColumn>
```

### Grid

```tsx
<Grid
  cols={1}
  mdCols={2}
  lgCols={3}
  gap={4}
>
  {/* Grid items */}
</Grid>
```

## Best Practices

1. **Avoid Fixed Pixel Dimensions**: Use relative units like percentages, fractions, or viewport units.

2. **Test Multiple Screen Sizes**: Always check your layout at various screen sizes during development.

3. **Use Stack-on-Mobile Pattern**: For multi-column layouts, stack columns vertically on mobile.

4. **Define Specific Screen-Size Variants**: Use responsive classes to define how elements should appear at each breakpoint.

5. **Be Consistent**: Follow the established patterns in the codebase for similar components.

6. **Progressive Enhancement**: Build the mobile view first, then enhance for larger screens.

## Common Responsive Patterns

### Changing Direction

```tsx
<View className="flex flex-col md:flex-row">
  {/* Stacks vertically on mobile, horizontal on desktop */}
</View>
```

### Hiding/Showing Elements

```tsx
<View className="hidden md:block">
  {/* Only visible on desktop */}
</View>

<View className="block md:hidden">
  {/* Only visible on mobile */}
</View>
```

### Changing Layout Priority

```tsx
<View className="order-2 md:order-1">
  {/* Changes position in flexbox based on screen size */}
</View>
```

Remember, consistent use of these patterns will ensure the application maintains a professional appearance across all devices and screen sizes.

# Responsive Design Guidelines

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

### 6. Use Unified Components with Responsive Classes

Rather than creating separate mobile and desktop layouts, create a single component that adapts using responsive classes:

```tsx
// Good
<Row className="flex-col md:flex-row" justifyContent="between" alignItems="center">
  <View className="mb-4 md:mb-0">
    {/* Content that stacks on mobile but shows side-by-side on desktop */}
  </View>
  <View>
    {/* More content */}
  </View>
</Row>

// Avoid
<>
  <View className="md:hidden">
    {/* Mobile layout */}
  </View>
  <View className="hidden md:block">
    {/* Desktop layout (duplicating code) */}
  </View>
</>
```

### 7. Efficient Responsive UI Elements

For UI elements that need different layouts on mobile vs desktop, use a single container with responsive views inside:

```tsx
// Good - Single touchable with responsive views inside
<TouchableOpacity className="w-full border-b border-border">
  {/* Mobile layout */}
  <View className="md:hidden py-3 px-4">
    {/* Mobile specific content */}
  </View>
  
  {/* Desktop layout */}
  <View className="hidden md:flex flex-row py-3 px-4">
    {/* Desktop specific content */}
  </View>
</TouchableOpacity>

// Avoid - Duplicating the entire touchable component
<>
  <TouchableOpacity className="md:hidden">
    {/* Mobile layout */}
  </TouchableOpacity>
  <TouchableOpacity className="hidden md:flex">
    {/* Desktop layout */}
  </TouchableOpacity>
</>
```

This approach is more efficient because:
1. It avoids duplicating event handlers
2. Only creates one component instance in the React tree
3. Simplifies state management for the component

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

### Header with Responsive Layout

```tsx
<Container>
  <Row 
    className="flex-col md:flex-row"
    justifyContent="between"
    alignItems="center"
  >
    {/* Logo and title - stacked on mobile */}
    <View className="mb-4 md:mb-0">
      <Logo />
      <Text>Site Title</Text>
    </View>
    
    {/* Navigation - full width on mobile, partial on desktop */}
    <View className="w-full md:w-auto">
      <Navigation />
    </View>
  </Row>
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
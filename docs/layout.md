# Layout System Documentation

This document describes the layout system used in the Open Libra Explorer application, which provides a consistent approach to building responsive layouts with NativeWind (Tailwind CSS for React Native).

## Overview

Our layout system is designed to:

1. Provide consistent spacing and alignment across the application
2. Implement responsive designs that work on mobile, tablet, and desktop
3. Leverage the power of the CSS Grid system
4. Create reusable components that follow best practices

## Core Components

### Container

The `Container` component enforces a maximum width and centers content horizontally. It includes consistent padding and is the foundation of our layout system.

```tsx
import { Container } from '../components/Layout';

<Container>
  {/* Your content goes here */}
</Container>
```

You can add additional classes with the `className` prop:

```tsx
<Container className="bg-secondary rounded-lg py-6">
  {/* Content with custom styling */}
</Container>
```

### Grid

The `Grid` component implements a responsive CSS grid with configurable columns at different breakpoints.

```tsx
import { Grid } from '../components/Layout';

<Grid cols={1} mdCols={2} lgCols={3} gap={4}>
  <View>Item 1</View>
  <View>Item 2</View>
  <View>Item 3</View>
  <View>Item 4</View>
  <View>Item 5</View>
  <View>Item 6</View>
</Grid>
```

#### Props:

- `cols`: Number of columns on mobile (default: 1)
- `mdCols`: Number of columns on medium screens (default: 2)
- `lgCols`: Number of columns on large screens (default: 3)
- `gap`: Gap between grid items (default: 4)

### TwoColumn

The `TwoColumn` component creates a two-column layout that can stack on mobile.

```tsx
import { TwoColumn } from '../components/Layout';

<TwoColumn leftWidth="w-1/3" rightWidth="w-2/3">
  <View>
    {/* Left column content */}
  </View>
  <View>
    {/* Right column content */}
  </View>
</TwoColumn>
```

#### Props:

- `leftWidth`: Width class for the left column (default: 'w-1/3')
- `rightWidth`: Width class for the right column (default: 'w-2/3')
- `stackOnMobile`: Whether to stack the columns on mobile (default: true)

### Row

The `Row` component is a flexbox wrapper for horizontal layouts.

```tsx
import { Row } from '../components/Layout';

<Row alignItems="center" justifyContent="between" wrap={true}>
  <View>Item 1</View>
  <View>Item 2</View>
  <View>Item 3</View>
</Row>
```

#### Props:

- `alignItems`: Vertical alignment ('start', 'center', 'end', 'stretch', 'baseline')
- `justifyContent`: Horizontal distribution ('start', 'center', 'end', 'between', 'around', 'evenly')
- `wrap`: Whether items should wrap to next line (default: false)

### Column

The `Column` component is a flexbox wrapper for vertical layouts.

```tsx
import { Column } from '../components/Layout';

<Column alignItems="center" justifyContent="center">
  <View>Item 1</View>
  <View>Item 2</View>
  <View>Item 3</View>
</Column>
```

#### Props:

- `alignItems`: Horizontal alignment ('start', 'center', 'end', 'stretch', 'baseline')
- `justifyContent`: Vertical distribution ('start', 'center', 'end', 'between', 'around', 'evenly')

## Responsive Breakpoints

Our layout system uses the standard Tailwind CSS breakpoints:

- `sm`: 640px and up
- `md`: 768px and up
- `lg`: 1024px and up
- `xl`: 1280px and up
- `2xl`: 1536px and up

You can use these breakpoints in your own styles:

```tsx
<View className="w-full md:w-1/2 lg:w-1/3">
  {/* This view is full width on mobile, half width on tablets, and one-third width on desktops */}
</View>
```

## Best Practices

1. Always start with a `Container` for page-level content
2. Use the appropriate layout component for the job:
   - `Grid` for grid layouts
   - `TwoColumn` for simple side-by-side content
   - `Row` for horizontal flex layouts
   - `Column` for vertical flex layouts
3. Use responsive classes to adapt layouts for different screen sizes
4. Nest components as needed for complex layouts

## Examples

### Page Layout with Grid

```tsx
import { Container, Grid } from '../components/Layout';

<Container>
  <Text className="text-2xl font-bold mb-4">Featured Items</Text>
  <Grid cols={1} mdCols={2} lgCols={3} gap={4}>
    <View className="bg-secondary p-4 rounded">Item 1</View>
    <View className="bg-secondary p-4 rounded">Item 2</View>
    <View className="bg-secondary p-4 rounded">Item 3</View>
    <View className="bg-secondary p-4 rounded">Item 4</View>
    <View className="bg-secondary p-4 rounded">Item 5</View>
    <View className="bg-secondary p-4 rounded">Item 6</View>
  </Grid>
</Container>
```

### Two Column Layout

```tsx
import { Container, TwoColumn } from '../components/Layout';

<Container>
  <TwoColumn leftWidth="w-full md:w-1/4" rightWidth="w-full md:w-3/4">
    <View className="bg-secondary p-4 rounded">
      {/* Sidebar content */}
    </View>
    <View className="bg-secondary p-4 rounded">
      {/* Main content */}
    </View>
  </TwoColumn>
</Container>
```

### Responsive Card Layout with Header

```tsx
import { Container, Row, Column } from '../components/Layout';

<Container>
  <Row justifyContent="between" className="mb-4">
    <Text className="text-2xl font-bold">Dashboard</Text>
    <TouchableOpacity className="bg-primary px-4 py-2 rounded">
      <Text className="text-white">Add New</Text>
    </TouchableOpacity>
  </Row>
  
  <View className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Cards */}
    <View className="bg-secondary p-4 rounded">Card 1</View>
    <View className="bg-secondary p-4 rounded">Card 2</View>
    <View className="bg-secondary p-4 rounded">Card 3</View>
  </View>
</Container>
``` 
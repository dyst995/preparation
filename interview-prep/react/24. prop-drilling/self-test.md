# Prop Drilling — When It’s Fine, When It’s a Smell — Self-test

## Core recall

1. What is prop drilling?
2. When is shallow drilling often preferable?
3. Name three signals that drilling has become a smell.
4. What is the preferred fix order?
5. How does composition remove the need to drill a prop through a shell?
6. How can over-lifted state cause drilling?
7. When is Context the right fix for drilling?
8. When step up to Zustand/Redux instead of Context?

## Explain why

1. Why is prop drilling often over-diagnosed as “always bad”?
2. Why is explicit prop flow easier to trace than Context?
3. Why prefer composition before Context?
4. Why doesn’t “parent passes `title` to child that displays it” count as a smell?
5. Why can lifting state “just in case” create drilling problems?
6. Why isn’t a mega `props` bag a good drilling fix?

## Compare and contrast

1. Prop drilling vs normal prop passing  
2. Composition (`children`) vs Context for avoiding relays  
3. Colocating state vs lifting then drilling  
4. Context vs Zustand as a drilling escape hatch  
5. Explicit props vs ambient store access  

## Predict / choose

1. `App → Page → Button` passes `onClick` used only by Button — smell? First move?  
2. Auth user needed in header, sidebar, and 12 feature leaves — lean?  
3. `Card` wrapper only needs to style children; today it also takes `user` for an avatar inside — better shape?  
4. Theme string used app-wide, changes rarely — Context or drill 6 levels?

## Debugging

1. Every layout file lists `user`, `theme`, `locale`, `flags` unused except at leaves. What’s wrong and what’s first fix?  
2. Team added ThemeContext for one `Button` two levels down. Critique.  
3. State lives in `App` because “two siblings might need it someday”; only one child uses it via 4 hops. Diagnose.  
4. `Dashboard` forwards 15 props to `Panel` which forwards them to `Widget`. Refactor approach?

## Application

1. Rewrite a 3-level `user` drill using `children` composition.  
2. Sketch when you’d colocate vs keep lifted for two sibling panels sharing a filter.  
3. Write the spoken “Is prop drilling always bad?” answer from memory.  
4. Given `Modal` shell + `UserForm` needing `userId`, show a composition-based JSX shape.

## Interview questions

1. Is prop drilling always bad?  
   - Follow-up: What’s your first fix?  
   - Follow-up: When do you reach for Context vs a store?
2. How do you decide between props, Context, and Zustand?  
3. Explain component composition as an alternative to drilling.  
4. Can prop drilling cause performance issues? When?

## Connections

1. How does this section fit the four-kinds / tool decision table?
2. How does Context’s re-render model change the “just use Context” impulse?
3. How is composition related to “containers vs presentational shells”?
4. How does colocation relate to local component state as the default?

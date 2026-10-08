import type { RecipeDetailsView } from '@open-legend/protocol';
import { Fragment } from 'react';
import './recipe-details.css';

/** Shared permitted recipe knowledge. Parents own native actions and creator provenance. */
export function RecipeDetails({ recipe }: { recipe: RecipeDetailsView }) {
  return (
    <div className="ol-recipe-details">
      <p>{recipe.description}</p>
      <dl>
        <dt>Materials</dt>
        <dd>
          {recipe.ingredients.map((ingredient, index) => (
            <div key={`${ingredient.role}:${ingredient.name}:${index}`}>
              {ingredient.quantity} {ingredient.name} ({ingredient.role}) —{' '}
              {typeof ingredient.available === 'number' && Number.isFinite(ingredient.available)
                ? `${ingredient.available} currently held`
                : 'availability unknown'}
            </div>
          ))}
        </dd>
        <dt>Work</dt>
        <dd>{recipe.workSeconds} game seconds</dd>
        <dt>Actual output</dt>
        <dd>
          <strong>{recipe.output.name}</strong>
          {recipe.output.description && <p>{recipe.output.description}</p>}
        </dd>
        {recipe.facts.map((fact) => (
          <Fragment key={fact.id}>
            <dt>{fact.label}</dt>
            <dd>
              {fact.value}
              {fact.unit && ` ${fact.unit}`}
            </dd>
          </Fragment>
        ))}
      </dl>
      {!!recipe.limitations.length && (
        <section aria-label="Recipe limitations">
          <h5>Limitations</h5>
          <ul>
            {recipe.limitations.map((limitation, index) => (
              <li key={index}>{limitation}</li>
            ))}
          </ul>
        </section>
      )}
      <p className="ol-caption">
        Resources are checked again when crafting starts. Inspecting this recipe does not craft it.
      </p>
    </div>
  );
}

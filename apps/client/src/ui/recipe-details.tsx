import type { RecipeDetailsView } from '@open-legend/protocol';
import { formatDisplayNumber } from '@open-legend/language';
import { Fragment } from 'react';
import { ItemIllustration } from '../design-system/item-illustration';
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
            <div key={`${ingredient.name}:${index}`}>
              <ItemIllustration
                art={ingredient.art}
                icon={ingredient.icon}
                label={ingredient.name}
                size={24}
              />{' '}
              {ingredient.quantity} {ingredient.name} —{' '}
              {typeof ingredient.available === 'number' && Number.isFinite(ingredient.available)
                ? `${ingredient.available} currently held`
                : 'availability unknown'}
            </div>
          ))}
        </dd>
        {!!recipe.retainedTools.length && (
          <>
            <dt>Kept tools</dt>
            <dd>
              {recipe.retainedTools.map((tool) => (
                <div key={tool.role}>
                  {tool.quantity}{' '}
                  {tool.choices
                    .map((choice) => `${choice.name} (${choice.available} held)`)
                    .join(' or ')}
                  ; reserved during work and kept afterward.
                </div>
              ))}
            </dd>
          </>
        )}
        <dt>Work</dt>
        <dd>{formatDisplayNumber(recipe.workSeconds)} game seconds</dd>
        <dt>Makes</dt>
        <dd>
          {recipe.outputs.map((output) => (
            <div key={output.port}>
              <ItemIllustration
                art={output.art}
                icon={output.icon}
                label={output.name}
                size={64}
                detail
              />{' '}
              <strong>
                {output.quantity} {output.name}
              </strong>
              {output.description && <p>{output.description}</p>}
            </div>
          ))}
        </dd>
        {recipe.facts.map((fact) => (
          <Fragment key={fact.id}>
            <dt>{fact.label}</dt>
            <dd>
              {typeof fact.value === 'number' ? formatDisplayNumber(fact.value) : fact.value}
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

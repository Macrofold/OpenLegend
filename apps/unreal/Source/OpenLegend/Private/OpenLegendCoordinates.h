#pragma once

#include "CoreMinimal.h"

namespace OpenLegend
{
    // The wire uses right-handed, Y-up metres. The Unreal scene uses centimetres.
    inline FVector ToScene(const FVector& Position)
    {
        return FVector(100.0 * Position.Z, -100.0 * Position.X, 100.0 * Position.Y);
    }

    inline FVector ToWorld(const FVector& Position)
    {
        return FVector(-Position.Y, Position.Z, Position.X) / 100.0;
    }

    inline double ToSceneYaw(double Heading)
    {
        return -FMath::RadiansToDegrees(Heading);
    }
}

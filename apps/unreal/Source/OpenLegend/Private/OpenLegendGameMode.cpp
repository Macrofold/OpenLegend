#include "OpenLegendGameMode.h"
#include "OpenLegendPlayer.h"

AOpenLegendGameMode::AOpenLegendGameMode()
{
    PlayerControllerClass = AOpenLegendPlayer::StaticClass();
    DefaultPawnClass = nullptr;
    bStartPlayersAsSpectators = false;
}

import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct BioheadHomeWidget: Widget {
  let name: String = "BioheadHomeWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      WidgetsEntryView(entry: entry)
    }
    .configurationDisplayName("Biohead")
    .description("Hurtigstart pusteøvelse")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
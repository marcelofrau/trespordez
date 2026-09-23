// Lê a library LiteDB do Playnite (Playnite 10+, schema por-tabela em
// library/*.db) e despeja os jogos como JSON:
//   [{ name, added, genres, platforms }]
//
// Uso:
//   playnite-extract.exe <libraryDir> [out.json] [keepHidden]
//   out.json opcional (default: STDOUT). keepHidden "1" inclui jogos ocultos.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.Json;
using LiteDB;

var libraryDir = args.Length > 0 ? args[0] : @"C:\Apps\Playnite\library";
var outFile = args.Length > 1 ? args[1] : null;
var keepHidden = args.Length > 2 && args[2] == "1";

var games = ReadAll(Path.Combine(libraryDir, "games.db"), "Game");
var genres = ReadAll(Path.Combine(libraryDir, "genres.db"), "Genre");
var platforms = ReadAll(Path.Combine(libraryDir, "platforms.db"), "Platform");

var genreKey = genres.ToDictionary(
    b => KeyOf(b["_id"]),
    b => b["Name"].AsString ?? "",
    StringComparer.OrdinalIgnoreCase);
var platformKey = platforms.ToDictionary(
    b => KeyOf(b["_id"]),
    b => b["Name"].AsString ?? "",
    StringComparer.OrdinalIgnoreCase);

static string KeyOf(BsonValue v) => (v.IsGuid ? v.AsGuid.ToString() : v.ToString())?.ToLowerInvariant() ?? "";

var rows = new List<object>();
foreach (var g in games)
{
    var name = g["Name"].AsString;
    if (string.IsNullOrWhiteSpace(name)) continue;
    if (!keepHidden && g.ContainsKey("Hidden") && g["Hidden"].AsBoolean) continue;

    var ids = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    foreach (var v in ArrayOf(g, "GenreIds"))
        ids.Add(KeyOf(v));
    var genreNames = ids.Select(id => genreKey.TryGetValue(id, out var n) ? n : null)
        .Where(n => !string.IsNullOrEmpty(n))
        .DistinctBy(n => n, StringComparer.OrdinalIgnoreCase)
        .ToList();

    ids.Clear();
    foreach (var v in ArrayOf(g, "PlatformIds"))
        ids.Add(KeyOf(v));
    var platformNames = ids.Select(id => platformKey.TryGetValue(id, out var n) ? n : null)
        .Where(n => !string.IsNullOrEmpty(n))
        .DistinctBy(n => n, StringComparer.OrdinalIgnoreCase)
        .ToList();

    rows.Add(new
    {
        name,
        added = AddedDate(g),
        genres = string.Join(", ", genreNames),
        platforms = string.Join(", ", platformNames),
    });
}

var json = System.Text.Json.JsonSerializer.Serialize(rows, new JsonSerializerOptions { WriteIndented = true });
if (outFile != null)
{
    File.WriteAllText(outFile, json);
    Console.Error.WriteLine($"playnite-extract: {rows.Count} jogos -> {outFile}");
}
else
{
    Console.Write(json);
}

static List<BsonDocument> ReadAll(string file, string collection)
{
    if (!File.Exists(file))
        throw new FileNotFoundException($"banco LiteDB não encontrado: {file}");
    using var lite = new LiteDatabase($"Filename={file};ReadOnly=true");
    return lite.GetCollection(collection).FindAll().ToList();
}

static IEnumerable<BsonValue> ArrayOf(BsonDocument doc, string key)
{
    if (!doc.ContainsKey(key) || !doc[key].IsArray) return Array.Empty<BsonValue>();
    return doc[key].AsArray;
}

static string AddedDate(BsonDocument g)
{
    if (!g.ContainsKey("Added") || g["Added"].IsNull) return null;
    if (g["Added"].IsDateTime) return g["Added"].AsDateTime.ToString("yyyy-MM-dd");
    var raw = g["Added"].ToString();
    if (raw == null) return null;
    if (DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.NoCurrentDateDefault, out var dt))
        return dt.ToString("yyyy-MM-dd");
    if (long.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var ticks))
        return new DateTime(ticks).ToString("yyyy-MM-dd");
    return null;
}